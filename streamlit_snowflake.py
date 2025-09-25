import streamlit as st
import requests

# Config - replace with your real credentials
POSTGRES_CONN_STR = "postgresql://postgres.odjkzowqixaqpesalenl:Rahul@2025@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
SNOWFLAKE_CONN_STR = "SOHAMP1003:mA8t23jpbs4FGYT@gvbchfa-wd34583.snowflakecomputing.com/MYDB"
SQLPIPE_API_URL = "http://localhost:9000/transfers/create"

# Your complete list of tables from schema.ts (replace snake_case if needed)
TABLES = [
    "user",
    "session",
    "account",
    "verification",
    "organization",
    "member",
    "invitation",
    "member_facility",
    "resident",
    "facility",
    "template",
    "ftag",
    "question",
    "case",
    "question_ftag",
    "survey",
    "survey_resident",
    "survey_case",
    "survey_response",
    "survey_poc",
    "poc_comment",
    "survey_doc",
    "dietary_surveys",
    "dietary_questions",
    "dietary_survey_questions",
    "dietary_answers",
]

def create_transfer(table: str):
    payload = {
        "source-name": "my-source",
        "source-type": "postgresql",
        "source-connection-string": POSTGRES_CONN_STR,
        "target-name": "my-target",
        "target-type": "snowflake",
        "target-connection-string": SNOWFLAKE_CONN_STR,
        "query": f"SELECT * FROM {table}",
        "target-table": table.lower() + "_snowflake",
        "drop-target-table-if-exists": True,
        "create-target-table-if-not-exists": True,
        "create-target-schema-if-not-exists": True,
        "target-schema": "public"
    }
    headers = {"Content-Type": "application/json"}
    response = requests.post(SQLPIPE_API_URL, json=payload, headers=headers)
    if response.ok:
        return response.json()
    else:
        st.error(f"Failed to create transfer for {table}: {response.text}")
        return None

def main():
    st.title("Supabase Postgres to Snowflake Full DB Sync")

    st.write(f"Syncing {len(TABLES)} tables from Supabase to Snowflake.")

    if st.button("Start Full Sync"):
        for t in TABLES:
            st.write(f"Starting transfer for table: {t}")
            result = create_transfer(t)
            if result and "transfer" in result:
                transfer_id = result["transfer"]["id"]
                st.write(f"Transfer started with ID: {transfer_id}")
            else:
                st.error(f"Could not start transfer for {t}")
        st.write("All transfers requested. Monitor individual transfer status via your SQLpipe UI or API.")

if __name__ == "__main__":
    main()
