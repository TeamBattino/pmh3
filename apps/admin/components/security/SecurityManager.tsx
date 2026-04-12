"use client";
import { Input } from "@/components/ui/Input";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table,
} from "@/components/ui/Table";
import { getSecurityConfig } from "@/lib/db/db-actions";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import Header from "./Header";
import RoleRow from "./RoleRow";

function SecurityManager() {
  const [search, setSearch] = useState("");

  const { data: securityConfig, isLoading } = useQuery({
    queryKey: ["securityConfig"],
    queryFn: getSecurityConfig,
  });

  const filteredRoles = securityConfig
    ? securityConfig.roles.filter((role) =>
        role.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Header />

      <div className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-foreground transition-colors">
          <Search className="h-4 w-4" />
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roles by name..."
          className="pl-10"
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-32 text-center animate-pulse text-muted-foreground"
                >
                  Loading security configuration...
                </TableCell>
              </TableRow>
            ) : filteredRoles.length > 0 ? (
              filteredRoles.map((role) => (
                <RoleRow key={role.name} role={role} variant="table" />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-32 text-center text-muted-foreground italic"
                >
                  No roles found matching &quot;{search}&quot;
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col gap-4">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center rounded-lg border animate-pulse text-muted-foreground">
            Loading security configuration...
          </div>
        ) : filteredRoles.length > 0 ? (
          <div className="rounded-lg border overflow-hidden flex flex-col">
            {filteredRoles.map((role) => (
              <RoleRow key={role.name} role={role} variant="card" />
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center rounded-lg border text-muted-foreground italic">
            No roles found matching &quot;{search}&quot;
          </div>
        )}
      </div>
    </div>
  );
}

export default SecurityManager;
