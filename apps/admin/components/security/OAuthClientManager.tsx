"use client";

import { Button } from "@/components/ui/Button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table,
} from "@/components/ui/Table";
import { getAuthClients, deleteAuthClient } from "@/lib/db/db-actions";
import { queryClient } from "@/lib/query-client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Globe } from "lucide-react";
import { toast } from "@/components/ui/Sonner";
import { OAuthClientModal } from "./OAuthClientModal";

export function OAuthClientManager() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ["authClients"],
    queryFn: getAuthClients,
  });

  const handleDelete = async (clientId: string, name: string) => {
    if (!confirm(`Delete service "${name}"? This cannot be undone.`)) return;
    try {
      await deleteAuthClient(clientId);
      queryClient.invalidateQueries({ queryKey: ["authClients"] });
      toast.success("Service deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete service");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Services</h2>
          <p className="text-sm text-muted-foreground">
            Manage OAuth clients that can authenticate through the SSO service.
          </p>
        </div>
        <OAuthClientModal
          mode="add"
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Service
            </Button>
          }
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead>Client ID</TableHead>
              <TableHead>Redirect URIs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-32 text-center animate-pulse text-muted-foreground"
                >
                  Loading services...
                </TableCell>
              </TableRow>
            ) : clients && clients.length > 0 ? (
              clients.map((client) => (
                <TableRow key={client.clientId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <div className="font-medium">{client.name}</div>
                        {client.description && (
                          <div className="text-xs text-muted-foreground">
                            {client.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {client.clientId}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {client.redirectUris.map((uri, i) => (
                        <code
                          key={i}
                          className="text-xs text-muted-foreground truncate max-w-xs block"
                        >
                          {uri}
                        </code>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <OAuthClientModal
                        client={client}
                        mode="edit"
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleDelete(client.clientId, client.name)
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-32 text-center text-muted-foreground italic"
                >
                  No services registered yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col gap-3">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center rounded-lg border animate-pulse text-muted-foreground">
            Loading services...
          </div>
        ) : clients && clients.length > 0 ? (
          clients.map((client) => (
            <div
              key={client.clientId}
              className="rounded-lg border p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{client.name}</span>
                </div>
                <div className="flex gap-1">
                  <OAuthClientModal
                    client={client}
                    mode="edit"
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleDelete(client.clientId, client.name)
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded self-start">
                {client.clientId}
              </code>
              {client.redirectUris.map((uri, i) => (
                <code
                  key={i}
                  className="text-xs text-muted-foreground truncate block"
                >
                  {uri}
                </code>
              ))}
            </div>
          ))
        ) : (
          <div className="h-32 flex items-center justify-center rounded-lg border text-muted-foreground italic">
            No services registered yet
          </div>
        )}
      </div>
    </div>
  );
}
