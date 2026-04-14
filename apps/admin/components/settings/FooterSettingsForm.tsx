"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Sonner";
import { cn } from "@/lib/cn";
import { saveFooter } from "@/lib/db/db-actions";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FooterDoc } from "@pfadipuck/puck-web/lib/footer-doc";
import { UrlFieldRender } from "@pfadipuck/puck-web/fields/url-field-render";
import { Footer } from "@pfadipuck/puck-web/ui/Footer";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

// ── Form state types (same as FooterDoc but with stable ids for dnd) ──
type FormLink = { id: string; label: string; href: string };
type FormColumn = { id: string; title: string; links: FormLink[] };
type FormState = { columns: FormColumn[]; legalLinks: FormLink[] };

const genId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function toForm(doc: FooterDoc): FormState {
  return {
    columns: doc.columns.map((c) => ({
      id: genId(),
      title: c.title,
      links: c.links.map((l) => ({ id: genId(), ...l })),
    })),
    legalLinks: doc.legalLinks.map((l) => ({ id: genId(), ...l })),
  };
}

function fromForm(form: FormState): FooterDoc {
  return {
    columns: form.columns.map((c) => ({
      title: c.title,
      links: c.links.map(({ id: _, ...rest }) => rest),
    })),
    legalLinks: form.legalLinks.map(({ id: _, ...rest }) => rest),
  };
}

// ── Reusable sortable link row ───────────────────────────────────────
function SortableLink({
  link,
  onChange,
  onRemove,
}: {
  link: FormLink;
  onChange: (patch: Partial<FormLink>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "grid grid-cols-[auto_1fr_1.5fr_auto] items-start gap-2",
        isDragging && "opacity-50"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1.5 flex size-7 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label="Drag"
      >
        <GripVertical className="size-4" />
      </button>
      <Input
        value={link.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Link label"
      />
      <UrlFieldRender
        value={link.href || undefined}
        onChange={(v) => onChange({ href: v ?? "" })}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        aria-label="Remove link"
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 />
      </Button>
    </div>
  );
}

// ── Sortable column ──────────────────────────────────────────────────
function SortableColumn({
  column,
  updateColumn,
  removeColumn,
}: {
  column: FormColumn;
  updateColumn: (patch: Partial<FormColumn>) => void;
  removeColumn: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.id });

  const linkIds = useMemo(() => column.links.map((l) => l.id), [column.links]);

  const onDragEndLinks = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = column.links.findIndex((l) => l.id === active.id);
    const newIdx = column.links.findIndex((l) => l.id === over.id);
    updateColumn({ links: arrayMove(column.links, oldIdx, newIdx) });
  };

  const addLink = () => {
    updateColumn({
      links: [...column.links, { id: genId(), label: "", href: "" }],
    });
  };

  const updateLink = (linkId: string, patch: Partial<FormLink>) => {
    updateColumn({
      links: column.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
    });
  };

  const removeLink = (linkId: string) => {
    updateColumn({ links: column.links.filter((l) => l.id !== linkId) });
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex flex-col gap-3 py-4",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex size-7 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          aria-label="Drag column"
        >
          <GripVertical className="size-4" />
        </button>
        <Input
          value={column.title}
          onChange={(e) => updateColumn({ title: e.target.value })}
          placeholder="Column title"
          className="text-base font-medium"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={removeColumn}
          aria-label="Remove column"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>

      <div className="ml-9 flex flex-col gap-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEndLinks}
        >
          <SortableContext
            items={linkIds}
            strategy={verticalListSortingStrategy}
          >
            {column.links.map((link) => (
              <SortableLink
                key={link.id}
                link={link}
                onChange={(patch) => updateLink(link.id, patch)}
                onRemove={() => removeLink(link.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addLink}
          className="self-start text-muted-foreground"
        >
          <Plus data-icon="inline-start" />
          Add link
        </Button>
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────
export function FooterSettingsForm({ initial }: { initial: FooterDoc }) {
  const [savedDoc, setSavedDoc] = useState<FooterDoc>(initial);
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [isPending, startTransition] = useTransition();

  const currentDoc = useMemo(() => fromForm(form), [form]);
  const isDirty = useMemo(
    () => JSON.stringify(currentDoc) !== JSON.stringify(savedDoc),
    [currentDoc, savedDoc]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columnIds = useMemo(() => form.columns.map((c) => c.id), [form.columns]);
  const legalIds = useMemo(() => form.legalLinks.map((l) => l.id), [form.legalLinks]);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const doc = fromForm(form);
        await saveFooter(doc);
        setSavedDoc(doc);
        toast.success("Footer saved");
      } catch (e) {
        console.error(e);
        toast.error("Failed to save footer");
      }
    });
  };

  const handleDiscard = () => {
    setForm(toForm(savedDoc));
  };

  const addColumn = () => {
    setForm((prev) => ({
      ...prev,
      columns: [
        ...prev.columns,
        { id: genId(), title: "", links: [] },
      ],
    }));
  };

  const updateColumn = (id: string, patch: Partial<FormColumn>) => {
    setForm((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
  };

  const removeColumn = (id: string) => {
    setForm((prev) => ({
      ...prev,
      columns: prev.columns.filter((c) => c.id !== id),
    }));
  };

  const onDragEndColumns = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = form.columns.findIndex((c) => c.id === active.id);
    const newIdx = form.columns.findIndex((c) => c.id === over.id);
    setForm((prev) => ({
      ...prev,
      columns: arrayMove(prev.columns, oldIdx, newIdx),
    }));
  };

  const onDragEndLegal = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = form.legalLinks.findIndex((l) => l.id === active.id);
    const newIdx = form.legalLinks.findIndex((l) => l.id === over.id);
    setForm((prev) => ({
      ...prev,
      legalLinks: arrayMove(prev.legalLinks, oldIdx, newIdx),
    }));
  };

  const addLegalLink = () => {
    setForm((prev) => ({
      ...prev,
      legalLinks: [
        ...prev.legalLinks,
        { id: genId(), label: "", href: "" },
      ],
    }));
  };

  const updateLegalLink = (id: string, patch: Partial<FormLink>) => {
    setForm((prev) => ({
      ...prev,
      legalLinks: prev.legalLinks.map((l) =>
        l.id === id ? { ...l, ...patch } : l
      ),
    }));
  };

  const removeLegalLink = (id: string) => {
    setForm((prev) => ({
      ...prev,
      legalLinks: prev.legalLinks.filter((l) => l.id !== id),
    }));
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Preview */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Preview
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border">
          <Footer data={currentDoc} preview />
        </div>
      </div>

      {/* Columns */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Link columns
          </h2>
        </div>
        {form.columns.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No columns yet.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEndColumns}
          >
            <SortableContext
              items={columnIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col divide-y divide-border">
                {form.columns.map((col) => (
                  <SortableColumn
                    key={col.id}
                    column={col}
                    updateColumn={(patch) => updateColumn(col.id, patch)}
                    removeColumn={() => removeColumn(col.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addColumn}
          className="self-start"
        >
          <Plus data-icon="inline-start" />
          Add column
        </Button>
      </section>

      {/* Legal links */}
      <section className="flex flex-col gap-2">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Legal links
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Shown in a single row at the very bottom, separated by /.
          </p>
        </div>
        {form.legalLinks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No legal links yet.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEndLegal}
          >
            <SortableContext
              items={legalIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {form.legalLinks.map((link) => (
                  <SortableLink
                    key={link.id}
                    link={link}
                    onChange={(patch) => updateLegalLink(link.id, patch)}
                    onRemove={() => removeLegalLink(link.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLegalLink}
          className="self-start"
        >
          <Plus data-icon="inline-start" />
          Add link
        </Button>
      </section>

      {/* Sticky save bar */}
      {isDirty && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
            <span className="text-sm text-muted-foreground">Unsaved changes</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={isPending}
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
