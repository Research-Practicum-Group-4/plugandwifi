import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Plus, Trash2, ToggleLeft, ToggleRight, Tags, Accessibility } from "lucide-react";

interface Tag {
  id: number;
  label: string;
  active: boolean;
}

const INITIAL_OWNERSHIP: Tag[] = [
  { id: 1, label: "WBE", active: true },
  { id: 2, label: "MBE", active: true },
  { id: 3, label: "LGBT+", active: true },
  { id: 4, label: "B-Corp", active: true },
  { id: 5, label: "VBE", active: true },
  { id: 6, label: "AAPI-Owned", active: false },
];

const INITIAL_ACCESSIBILITY: Tag[] = [
  { id: 1, label: "Wheelchair Accessible", active: true },
  { id: 2, label: "Elevator Access", active: true },
  { id: 3, label: "Braille Menus", active: false },
  { id: 4, label: "Hearing Loop", active: false },
  { id: 5, label: "Accessible Restrooms", active: true },
];

function TagManager({
  title,
  icon: Icon,
  tags,
  setTags,
}: {
  title: string;
  icon: React.ElementType;
  tags: Tag[];
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
}) {
  const [newLabel, setNewLabel] = useState("");

  const addTag = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    setTags((prev) => [
      ...prev,
      { id: Date.now(), label: trimmed, active: true },
    ]);
    setNewLabel("");
  };

  const toggleTag = (id: number) => {
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t)));
  };

  const deleteTag = (id: number) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add new tag */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder={`New ${title.toLowerCase()} tag...`}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            className="flex-1"
          />
          <Button onClick={addTag} className="gap-1" style={{ backgroundColor: "#2f8a64" }}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        <Separator className="mb-4" />

        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border">
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-xs ${
                    tag.active
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tag.active ? "Active" : "Inactive"}
                </Badge>
                <span className="text-sm font-medium">{tag.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => toggleTag(tag.id)}
                  title={tag.active ? "Deactivate" : "Activate"}
                >
                  {tag.active ? (
                    <ToggleRight className="size-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="size-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                  onClick={() => deleteTag(tag.id)}
                  title="Delete tag"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TaxonomyManagementPage() {
  const [ownershipTags, setOwnershipTags] = useState<Tag[]>(INITIAL_OWNERSHIP);
  const [accessibilityTags, setAccessibilityTags] = useState<Tag[]>(INITIAL_ACCESSIBILITY);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="mb-1">Taxonomy Management</h1>
        <p className="text-muted-foreground">
          Manage ownership and accessibility tags used across the platform
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <TagManager
          title="Ownership Tags"
          icon={Tags}
          tags={ownershipTags}
          setTags={setOwnershipTags}
        />
        <TagManager
          title="Accessibility Features"
          icon={Accessibility}
          tags={accessibilityTags}
          setTags={setAccessibilityTags}
        />
      </div>
    </div>
  );
}
