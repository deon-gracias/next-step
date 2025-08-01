--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4 (Debian 17.4-1.pgdg120+2)
-- Dumped by pg_dump version 17.4 (Debian 17.4-1.pgdg120+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: admin
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO admin;

--
-- Name: met_status_enum; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.met_status_enum AS ENUM (
    'met',
    'unmet',
    'not_applicable'
);


ALTER TYPE public.met_status_enum OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: admin
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO admin;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: admin
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO admin;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: admin
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: account; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.account (
    id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp without time zone,
    refresh_token_expires_at timestamp without time zone,
    scope text,
    password text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.account OWNER TO admin;

--
-- Name: facility; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.facility (
    id integer NOT NULL,
    name text NOT NULL,
    address text NOT NULL
);


ALTER TABLE public.facility OWNER TO admin;

--
-- Name: facility_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.facility ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.facility_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ftag; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.ftag (
    id integer NOT NULL,
    code text NOT NULL,
    description text
);


ALTER TABLE public.ftag OWNER TO admin;

--
-- Name: ftag_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.ftag ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ftag_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: invitation; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.invitation (
    id text NOT NULL,
    organization_id text NOT NULL,
    email text NOT NULL,
    role text,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    inviter_id text NOT NULL
);


ALTER TABLE public.invitation OWNER TO admin;

--
-- Name: member; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.member (
    id text NOT NULL,
    organization_id text NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.member OWNER TO admin;

--
-- Name: organization; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.organization (
    id text NOT NULL,
    name text NOT NULL,
    slug text,
    logo text,
    created_at timestamp without time zone NOT NULL,
    metadata text
);


ALTER TABLE public.organization OWNER TO admin;

--
-- Name: question; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.question (
    id integer NOT NULL,
    text text NOT NULL,
    template_id integer NOT NULL
);


ALTER TABLE public.question OWNER TO admin;

--
-- Name: question_ftag; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.question_ftag (
    question_id integer NOT NULL,
    ftag_id integer NOT NULL
);


ALTER TABLE public.question_ftag OWNER TO admin;

--
-- Name: question_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.question ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.question_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: resident; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.resident (
    id integer NOT NULL,
    name text NOT NULL,
    facility_id integer NOT NULL
);


ALTER TABLE public.resident OWNER TO admin;

--
-- Name: resident_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.resident ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.resident_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.session (
    id text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL,
    active_organization_id text
);


ALTER TABLE public.session OWNER TO admin;

--
-- Name: survey; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.survey (
    id integer NOT NULL,
    surveyor_id text NOT NULL,
    facility_id integer NOT NULL,
    template_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.survey OWNER TO admin;

--
-- Name: survey_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.survey ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.survey_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: survey_resident; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.survey_resident (
    id integer NOT NULL,
    survey_id integer NOT NULL,
    resident_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.survey_resident OWNER TO admin;

--
-- Name: survey_resident_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.survey_resident ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.survey_resident_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: survey_response; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.survey_response (
    id integer NOT NULL,
    survey_id integer NOT NULL,
    resident_id integer NOT NULL,
    question_id integer NOT NULL,
    requirements_met_or_unmet public.met_status_enum DEFAULT 'not_applicable'::public.met_status_enum,
    findings text
);


ALTER TABLE public.survey_response OWNER TO admin;

--
-- Name: survey_response_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.survey_response ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.survey_response_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: template; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.template (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.template OWNER TO admin;

--
-- Name: template_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.template ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified boolean NOT NULL,
    image text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public."user" OWNER TO admin;

--
-- Name: verification; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.verification OWNER TO admin;

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: admin
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: admin
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: facility facility_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.facility
    ADD CONSTRAINT facility_pkey PRIMARY KEY (id);


--
-- Name: ftag ftag_code_unique; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ftag
    ADD CONSTRAINT ftag_code_unique UNIQUE (code);


--
-- Name: ftag ftag_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ftag
    ADD CONSTRAINT ftag_pkey PRIMARY KEY (id);


--
-- Name: invitation invitation_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.invitation
    ADD CONSTRAINT invitation_pkey PRIMARY KEY (id);


--
-- Name: member member_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: organization organization_slug_unique; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_slug_unique UNIQUE (slug);


--
-- Name: question_ftag question_ftag_question_id_ftag_id_pk; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_ftag
    ADD CONSTRAINT question_ftag_question_id_ftag_id_pk PRIMARY KEY (question_id, ftag_id);


--
-- Name: question question_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_pkey PRIMARY KEY (id);


--
-- Name: resident resident_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.resident
    ADD CONSTRAINT resident_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_unique; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_unique UNIQUE (token);


--
-- Name: survey survey_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey
    ADD CONSTRAINT survey_pkey PRIMARY KEY (id);


--
-- Name: survey_resident survey_resident_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey_resident
    ADD CONSTRAINT survey_resident_pkey PRIMARY KEY (id);


--
-- Name: survey_resident survey_resident_resident_id_survey_id_unique; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey_resident
    ADD CONSTRAINT survey_resident_resident_id_survey_id_unique UNIQUE (resident_id, survey_id);


--
-- Name: survey_response survey_response_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey_response
    ADD CONSTRAINT survey_response_pkey PRIMARY KEY (id);


--
-- Name: survey_response survey_response_question_id_resident_id_survey_id_unique; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey_response
    ADD CONSTRAINT survey_response_question_id_resident_id_survey_id_unique UNIQUE (question_id, resident_id, survey_id);


--
-- Name: template template_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.template
    ADD CONSTRAINT template_pkey PRIMARY KEY (id);


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: account account_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_inviter_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.invitation
    ADD CONSTRAINT invitation_inviter_id_user_id_fk FOREIGN KEY (inviter_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_organization_id_organization_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.invitation
    ADD CONSTRAINT invitation_organization_id_organization_id_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id) ON DELETE CASCADE;


--
-- Name: member member_organization_id_organization_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_organization_id_organization_id_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id) ON DELETE CASCADE;


--
-- Name: member member_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: question_ftag question_ftag_ftag_id_ftag_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_ftag
    ADD CONSTRAINT question_ftag_ftag_id_ftag_id_fk FOREIGN KEY (ftag_id) REFERENCES public.ftag(id);


--
-- Name: question_ftag question_ftag_question_id_question_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question_ftag
    ADD CONSTRAINT question_ftag_question_id_question_id_fk FOREIGN KEY (question_id) REFERENCES public.question(id);


--
-- Name: question question_template_id_template_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_template_id_template_id_fk FOREIGN KEY (template_id) REFERENCES public.template(id);


--
-- Name: resident resident_facility_id_facility_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.resident
    ADD CONSTRAINT resident_facility_id_facility_id_fk FOREIGN KEY (facility_id) REFERENCES public.facility(id);


--
-- Name: session session_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: survey survey_facility_id_facility_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey
    ADD CONSTRAINT survey_facility_id_facility_id_fk FOREIGN KEY (facility_id) REFERENCES public.facility(id);


--
-- Name: survey_resident survey_resident_resident_id_resident_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey_resident
    ADD CONSTRAINT survey_resident_resident_id_resident_id_fk FOREIGN KEY (resident_id) REFERENCES public.resident(id);


--
-- Name: survey_resident survey_resident_survey_id_survey_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey_resident
    ADD CONSTRAINT survey_resident_survey_id_survey_id_fk FOREIGN KEY (survey_id) REFERENCES public.survey(id);


--
-- Name: survey_response survey_response_question_id_question_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey_response
    ADD CONSTRAINT survey_response_question_id_question_id_fk FOREIGN KEY (question_id) REFERENCES public.question(id);


--
-- Name: survey_response survey_response_resident_id_resident_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey_response
    ADD CONSTRAINT survey_response_resident_id_resident_id_fk FOREIGN KEY (resident_id) REFERENCES public.resident(id);


--
-- Name: survey_response survey_response_survey_id_survey_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey_response
    ADD CONSTRAINT survey_response_survey_id_survey_id_fk FOREIGN KEY (survey_id) REFERENCES public.survey(id);


--
-- Name: survey survey_surveyor_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey
    ADD CONSTRAINT survey_surveyor_id_user_id_fk FOREIGN KEY (surveyor_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: survey survey_template_id_template_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.survey
    ADD CONSTRAINT survey_template_id_template_id_fk FOREIGN KEY (template_id) REFERENCES public.template(id);


--
-- PostgreSQL database dump complete
--

