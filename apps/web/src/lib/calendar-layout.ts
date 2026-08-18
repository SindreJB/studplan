export interface TimedEvent {
  startsAt: number;
  endsAt: number;
}

export interface PositionedEvent<Event extends TimedEvent> {
  event: Event;
  column: number;
  columns: number;
}

export function positionEvents<Event extends TimedEvent>(
  events: readonly Event[],
): PositionedEvent<Event>[] {
  const sorted = [...events].sort((left, right) => left.startsAt - right.startsAt);
  const positioned: PositionedEvent<Event>[] = [];

  for (let index = 0; index < sorted.length;) {
    const first = sorted[index];
    if (!first) break;

    const group: Event[] = [];
    let groupEnd = first.endsAt;
    while (index < sorted.length) {
      const event = sorted[index];
      if (!event || (group.length > 0 && event.startsAt >= groupEnd)) break;
      group.push(event);
      groupEnd = Math.max(groupEnd, event.endsAt);
      index += 1;
    }

    const columnEnds: number[] = [];
    const placements = group.map((event) => {
      const available = columnEnds.findIndex((end) => end <= event.startsAt);
      const column = available === -1 ? columnEnds.length : available;
      columnEnds[column] = event.endsAt;
      return { event, column };
    });
    positioned.push(
      ...placements.map(({ event, column }) => ({ event, column, columns: columnEnds.length })),
    );
  }

  return positioned;
}
