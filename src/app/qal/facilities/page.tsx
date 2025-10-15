"use client";

import { useEffect, useMemo, useState, type JSXElementConstructor, type ReactElement, type ReactNode, type ReactPortal } from "react";
import { api } from "@/trpc/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { BuildingIcon, PlusIcon, SearchIcon, SaveIcon, XIcon, Trash2Icon } from "lucide-react";

type RowEdit = {
  id: number | "new";
  name: string;
  address: string;
  facilityCode?: string | null;
};

export default function QALFacilitiesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const facilities = api.facility.list.useQuery(
    { page, pageSize, name: search || undefined },
    { placeholderData: (prev) => prev },
  );

  const utils = api.useUtils();

  const create = api.facility.create.useMutation({
    onSuccess: async () => {
      toast.success("Facility created");
      await utils.facility.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // const update = api.facility.update.useMutation({
  //   onSuccess: async () => {
  //     toast.success("Facility updated");
  //     await utils.facility.list.invalidate();
  //   },
  //   onError: (e: { message: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | (() => React.ReactNode) | null | undefined; }) => toast.error(e.message),
  // });

  const del = api.facility.delete.useMutation({
    onSuccess: async () => {
      toast.success("Facility deleted");
      await utils.facility.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [editing, setEditing] = useState<RowEdit | null>(null);
  const [creating, setCreating] = useState<RowEdit | null>(null);

  // Debounce search locally (optional: can add a real debounce hook)
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      facilities.refetch();
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const total = facilities.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const rows = useMemo(() => facilities.data?.data ?? [], [facilities.data]);

  const startCreate = () => {
    setCreating({ id: "new", name: "", address: "", facilityCode: "" });
  };

  const cancelCreate = () => {
    setCreating(null);
  };

  const saveCreate = async () => {
    if (!creating) return;
    if (!creating.name.trim() || !creating.address.trim()) {
      toast.error("Name and address are required");
      return;
    }
    await create.mutateAsync({
      name: creating.name.trim(),
      address: creating.address.trim(),
      facilityCode: creating.facilityCode?.trim() || undefined,
    });
    setCreating(null);
  };

  const startEdit = (r: any) => {
    setEditing({
      id: r.id,
      name: r.name ?? "",
      address: r.address ?? "",
      facilityCode: r.facilityCode ?? "",
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing || typeof editing.id !== "number") return;
    if (!editing.name.trim() || !editing.address.trim()) {
      toast.error("Name and address are required");
      return;
    }
    // await update.mutateAsync({
    //   id: editing.id,
    //   name: editing.name.trim(),
    //   address: editing.address.trim(),
    //   facilityCode: editing.facilityCode?.trim() || undefined,
    // });
    setEditing(null);
  };

  const removeRow = async (id: number) => {
    // Optional confirm
    if (!confirm("Delete this facility? This cannot be undone.")) return;
    await del.mutateAsync({ id });
  };

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <BuildingIcon className="h-5 w-5 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Facilities</h1>
            <p className="text-sm text-muted-foreground">Manage facilities used for QAL surveys</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-7 w-64"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!creating && (
            <Button variant="outline" onClick={startCreate}>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Facility
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Facilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {creating && (
            <div className="rounded-md border p-3 bg-muted/40">
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  placeholder="Facility name"
                  value={creating.name}
                  onChange={(e) => setCreating({ ...creating, name: e.target.value })}
                />
                <Input
                  placeholder="Address"
                  value={creating.address}
                  onChange={(e) => setCreating({ ...creating, address: e.target.value })}
                />
                <Input
                  placeholder="Facility code (optional)"
                  value={creating.facilityCode ?? ""}
                  onChange={(e) => setCreating({ ...creating, facilityCode: e.target.value })}
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button onClick={saveCreate} disabled={create.isPending}>
                  {create.isPending ? "Saving..." : "Save"}
                </Button>
                <Button variant="ghost" onClick={cancelCreate}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-100px text-right">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const isEditing = editing?.id === r.id;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-right font-mono tabular-nums">{r.id}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editing?.name ?? ""}
                          onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                        />
                      ) : (
                        <span className="font-medium">{r.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editing?.address ?? ""}
                          onChange={(e) => setEditing((prev) => (prev ? { ...prev, address: e.target.value } : prev))}
                        />
                      ) : (
                        <span className="text-sm">{r.address}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editing?.facilityCode ?? ""}
                          onChange={(e) =>
                            setEditing((prev) => (prev ? { ...prev, facilityCode: e.target.value } : prev))
                          }
                        />
                      ) : (
                        <Badge variant="secondary">{r.facilityCode ?? "-"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          {/* <Button size="sm" onClick={saveEdit} disabled={update.isPending}> */}
                            <SaveIcon className="h-4 w-4 mr-2" />
                            {/* {update.isPending ? "Saving..." : "Save"} */}
                          {/* </Button> */}
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            <XIcon className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeRow(r.id)}
                            disabled={del.isPending}
                          >
                            <Trash2Icon className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No facilities found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm pt-2">
            <div className="text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev || facilities.isLoading}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!hasNext || facilities.isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
