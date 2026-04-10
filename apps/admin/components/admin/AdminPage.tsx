"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getAllPaths } from "@/lib/db/db-actions";
import { useQuery } from "@tanstack/react-query";
import Header from "./Header";
import PageRow from "./PageRow";

function AdminPage() {
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: getAllPaths,
  });

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      <Header />

      <Card>
        <CardHeader>
          <CardTitle>Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <PageRow key={page} page={page} />
              ))}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && pages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No pages yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminPage;
