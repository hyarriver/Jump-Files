"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { User } from "@/types/lan-transfer";

interface NearbyDevicesProps {
  currentUser?: User | null;
  users: User[];
  selectedUserIds: Set<string>;
  onToggle: (id: string) => void;
}

export function NearbyDevices({
  currentUser,
  users,
  selectedUserIds,
  onToggle,
}: NearbyDevicesProps) {
  return (
    <div className="w-full max-w-5xl mb-12">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-sm font-medium text-neutral-500 tracking-wide uppercase">
          附近设备
        </h2>
        <span className="text-xs text-neutral-400 bg-white px-2 py-1 rounded-full border border-neutral-100 shadow-sm">
          {users.length} 在线
        </span>
      </div>

      <div className="w-full overflow-x-auto rounded-3xl border border-white/50 bg-white/40 backdrop-blur-xl shadow-sm p-6">
        <div className="flex w-max space-x-6 items-center">
          {currentUser && (
            <>
              <div className="group relative flex flex-col items-center gap-3 opacity-100 cursor-default">
                <div className="relative">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white shadow-lg">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-500 text-lg">
                      {currentUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[10px] font-bold shadow-sm z-10">
                    YOU
                  </span>
                </div>
                <div className="text-center space-y-0.5">
                  <p className="text-sm font-semibold text-neutral-800 leading-tight">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-neutral-400 font-medium">
                    {currentUser.deviceName}
                  </p>
                </div>
              </div>
              {users.length > 0 && (
                <div className="h-24 w-px bg-neutral-200/60 mx-2" />
              )}
            </>
          )}

          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onToggle(user.id)}
              className={cn(
                "group relative flex flex-col items-center gap-3 transition-all duration-300 ease-out outline-none",
                selectedUserIds.has(user.id)
                  ? "scale-105 opacity-100"
                  : "opacity-60 hover:opacity-100 hover:scale-105"
              )}
            >
              <div className="relative">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white shadow-lg transition-all duration-500 group-hover:shadow-xl">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-500 text-lg">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm transition-transform duration-300" />
                {selectedUserIds.has(user.id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 rounded-full">
                    <Check className="h-8 w-8 text-emerald-600" />
                  </div>
                )}
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-sm font-semibold text-neutral-800 leading-tight">
                  {user.name}
                </p>
                <p className="text-xs text-neutral-400 font-medium">
                  {user.deviceName}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
