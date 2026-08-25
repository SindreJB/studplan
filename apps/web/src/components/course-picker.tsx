import type { CourseCatalogItem } from "@repo/db/schema";
import { Button } from "@repo/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components/combobox";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { addCalendarCourseMutationOptions } from "#/lib/mutations";

function courseLabel(course: CourseCatalogItem) {
  return `${course.id} · ${course.nameEn ?? course.name ?? course.nameNb ?? "Unnamed course"} · term ${course.term}`;
}

export function CoursePicker({
  calendarId,
  semester,
  courses,
}: {
  calendarId: string;
  semester: string;
  courses: CourseCatalogItem[];
}) {
  const addCourse = useMutation(addCalendarCourseMutationOptions());
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CourseCatalogItem | null>(null);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) => courseLabel(course).toLocaleLowerCase().includes(normalized));
  }, [courses, query]);
  // react-doctor-disable-next-line react-hooks-js/incompatible-library
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 40,
    initialRect: { width: 0, height: 288 },
    overscan: 8,
  });

  async function addSelectedCourse() {
    if (!selected) return;
    await addCourse.mutateAsync({
      calendarId,
      semester,
      id: selected.id,
      term: selected.term,
    });
    setSelected(null);
    setQuery("");
    await router.invalidate({ sync: true });
  }

  return (
    <div className="flex gap-2">
      <Combobox
        items={filtered}
        filteredItems={filtered}
        value={selected}
        onValueChange={setSelected}
        inputValue={query}
        onInputValueChange={setQuery}
        itemToStringLabel={courseLabel}
        isItemEqualToValue={(left, right) => left.id === right.id && left.term === right.term}
        virtualized
      >
        <ComboboxInput className="w-full" placeholder="Search by course code or name…" showClear />
        <ComboboxContent>
          <ComboboxEmpty>No courses found.</ComboboxEmpty>
          <ComboboxList ref={listRef} className="h-72 max-h-72" style={{ position: "relative" }}>
            <div style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((row) => {
                const course = filtered[row.index];
                if (!course) return null;
                return (
                  <ComboboxItem
                    key={`${course.id}-${course.term}`}
                    value={course}
                    index={row.index}
                    className="absolute top-0 left-0 w-full"
                    style={{ height: row.size, transform: `translateY(${row.start}px)` }}
                  >
                    <span className="font-medium">{course.id}</span>
                    <span className="truncate text-muted-foreground">
                      {course.nameEn ?? course.name ?? course.nameNb} · term {course.term}
                    </span>
                  </ComboboxItem>
                );
              })}
            </div>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Button type="button" disabled={!selected || addCourse.isPending} onClick={addSelectedCourse}>
        <Plus /> Add
      </Button>
    </div>
  );
}
