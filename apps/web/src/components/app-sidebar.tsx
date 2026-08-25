import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@repo/ui/components/sidebar";
import {
  linkOptions,
  Link,
  type LinkOptions,
  type RegisteredRouter,
  useParams,
} from "@tanstack/react-router";
import {
  CalendarDays,
  CalendarRange,
  ChevronsUpDown,
  ListChecks,
  Plus,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { SignOutButton } from "#/components/sign-out-button";

type Calendar = { id: string; name: string };

type AppNavLinkProps = {
  label: string;
  icon: LucideIcon;
  link: LinkOptions<
    RegisteredRouter,
    string,
    "/app/$calendarId" | "/app/$calendarId/schedule" | "/app/$calendarId/settings"
  >;
};

function AppNavLink({ label, icon: Icon, link }: AppNavLinkProps) {
  return (
    <SidebarMenuItem>
      <Link {...link}>
        {({ isActive }) => (
          <SidebarMenuButton isActive={isActive} tooltip={label} render={<span />}>
            <Icon />
            <span>{label}</span>
          </SidebarMenuButton>
        )}
      </Link>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ calendars }: { calendars: Calendar[] }) {
  const { isMobile, state } = useSidebar();
  const { calendarId } = useParams({ strict: false });
  const activeCalendar = calendars.find((calendar) => calendar.id === calendarId);
  const links = activeCalendar
    ? [
        {
          label: "Courses",
          icon: ListChecks,
          link: linkOptions({
            to: "/app/$calendarId",
            params: { calendarId: activeCalendar.id },
            activeOptions: { exact: true },
          }),
        },
        {
          label: "Schedule",
          icon: CalendarRange,
          link: linkOptions({
            to: "/app/$calendarId/schedule",
            params: { calendarId: activeCalendar.id },
          }),
        },
        {
          label: "Settings",
          icon: Settings,
          link: linkOptions({
            to: "/app/$calendarId/settings",
            params: { calendarId: activeCalendar.id },
          }),
        },
      ]
    : [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                  />
                }
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8">
                  S
                </span>
                {state === "expanded" && (
                  <>
                    <span className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {activeCalendar?.name ?? "Studplan"}
                      </span>
                      <span className="truncate text-xs">
                        {activeCalendar ? "Calendar" : "No calendar"}
                      </span>
                    </span>
                    <ChevronsUpDown className="ml-auto" />
                  </>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
                className="min-w-56"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Calendars</DropdownMenuLabel>
                  {calendars.map((calendar) => (
                    <DropdownMenuItem
                      key={calendar.id}
                      render={
                        <Link
                          {...linkOptions({
                            to: "/app/$calendarId",
                            params: { calendarId: calendar.id },
                            activeOptions: { exact: true },
                          })}
                        />
                      }
                    >
                      <CalendarDays /> {calendar.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                {calendars.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuItem render={<Link to="/app/new" />}>
                    <Plus /> New calendar
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Calendar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <AppNavLink {...item} key={item.label} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
          <Button
            className="flex-1 justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            variant="outline"
            render={<Link to="/app/settings" />}
            nativeButton={false}
          >
            <UserRound /> Account settings
          </Button>
          <SignOutButton />
        </div>
        <Button
          className="hidden group-data-[collapsible=icon]:flex hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          variant="outline"
          size="icon"
          render={<Link to="/app/settings" />}
          nativeButton={false}
          aria-label="Account settings"
        >
          <UserRound />
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
