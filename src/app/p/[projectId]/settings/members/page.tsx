"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/types";

interface MemberRow {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    role: string;
  };
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function MembersSettingsPage() {
  const { projectId, isProjectAdmin } = useProject();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("editor");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  async function fetchMembers() {
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const json = await res.json();
      setMembers(json.data ?? []);
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) return;

    setInviting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to invite member");
      }
      toast.success(`Invited ${email}`);
      setInviteEmail("");
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update role");
      }
      toast.success("Role updated");
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemove(userId: string, userName: string | null) {
    if (!confirm(`Remove ${userName || "this member"} from the project?`)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove member");
      }
      toast.success("Member removed");
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Team Members</CardTitle>
              <CardDescription>
                {members.length} member{members.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invite form */}
          {isProjectAdmin && (
            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="Invite by email..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInvite();
                  }
                }}
                className="flex-1"
              />
              <Select
                value={inviteRole}
                onValueChange={(val) => setInviteRole(val as UserRole)}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                {inviting ? "Inviting..." : "Invite"}
              </Button>
            </div>
          )}

          {/* Members table */}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {isProjectAdmin && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isLastAdmin =
                    member.role === "admin" && adminCount <= 1;
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(member.user?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {member.user?.name ?? "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.user?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isProjectAdmin ? (
                          <Select
                            value={member.role}
                            onValueChange={(val) =>
                              handleRoleChange(member.user_id, val as UserRole)
                            }
                            disabled={isLastAdmin}
                          >
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm capitalize">{member.role}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(member.created_at).toLocaleDateString()}
                      </TableCell>
                      {isProjectAdmin && (
                        <TableCell>
                          {!isLastAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                handleRemove(member.user_id, member.user?.name ?? null)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {adminCount <= 1 && (
            <p className="text-xs text-amber-600">
              The last admin cannot be removed or demoted.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
