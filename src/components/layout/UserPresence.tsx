"use client";

import { usePresence, PresenceUser } from "@/hooks/use-presence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function UserAvatar({ user }: { user: PresenceUser }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className="h-8 w-8 border-2 border-green-400 ring-2 ring-white">
          <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
          <AvatarFallback className="text-xs">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{user.name}</p>
        {user.currentPageId && (
          <p className="text-xs text-muted-foreground">
            Viewing a page
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function UserPresence() {
  const { onlineUsers } = usePresence();

  if (onlineUsers.length === 0) return null;

  const visible = onlineUsers.slice(0, 5);
  const overflow = onlineUsers.length - 5;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <UserAvatar key={user.userId} user={user} />
      ))}
      {overflow > 0 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600">
          +{overflow}
        </div>
      )}
    </div>
  );
}
