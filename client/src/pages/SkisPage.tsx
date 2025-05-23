import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Pencil, Check, X, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skiService } from "@/services/skiService";
import { toast } from "sonner";
import { Ski } from "@/types/ski";
import Navbar from "@/components/Navbar";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [newSkiName, setNewSkiName] = useState("");
  // State for inline editing
  const [editingSkiId, setEditingSkiId] = useState<string | null>(null);
  const [editedSkiName, setEditedSkiName] = useState("");

  const { data: skis, isLoading, error } = useQuery({
    queryKey: ['skis'],
    queryFn: skiService.getSkis,
  });

  const { mutate: addSki, isPending: isAddingSki } = useMutation({
    mutationFn: skiService.addSki,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skis'] });
      toast.success("Ski added successfully!");
      setNewSkiName("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add ski");
    },
  });

  // Mutation for updating skis
  const { mutate: updateSki, isPending: isUpdatingSki } = useMutation({
    mutationFn: ({ skiId, name }: { skiId: string; name: string }) => skiService.updateSki(skiId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skis'] }); // Refetch skis list
      toast.success("Ski updated successfully!");
      setEditingSkiId(null); // Exit editing mode
      setEditedSkiName("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update ski");
    },
  });

  // Mutation for deleting skis
  const { mutate: deleteSki, isPending: isDeletingSki } = useMutation({
    mutationFn: skiService.deleteSki,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skis'] }); // Refetch skis list
      toast.success("Ski deleted successfully!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete ski");
    },
  });

  const handleDeleteSki = (skiId: string) => {
    if (window.confirm("Are you sure you want to delete this ski?")) {
      deleteSki(skiId);
    }
  };

  // Handlers for inline editing
  const handleStartEdit = (ski: Ski) => {
    setEditingSkiId(ski.id);
    setEditedSkiName(ski.name);
  };

  const handleCancelEdit = () => {
    setEditingSkiId(null);
    setEditedSkiName("");
  };

  const handleSaveEdit = () => {
    if (!editingSkiId) return;
    if (!editedSkiName.trim()) {
      toast.error("Ski name cannot be empty.");
      return;
    }
    updateSki({ skiId: editingSkiId, name: editedSkiName.trim() });
  };

  const handleAddSkiSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newSkiName.trim()) {
        toast.error("Please enter a ski name.");
        return;
    }
    addSki({ name: newSkiName.trim() });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navbar centerContent="Manage Skis" />
      <div className="max-w-2xl mx-auto space-y-8 p-4">

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Your Skis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              {isLoading && (
                <div className="flex items-center text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading skis...
                </div>
              )}
              {error && (
                <p className="text-red-600">Error loading skis: {error.message}</p>
              )}
              {!isLoading && !error && (
                <ol className="list-disc list-inside space-y-1 text-slate-700">
                  {skis && skis.length > 0 ? (
                    skis.map((ski) => (
                      <li key={ski.id} className="flex justify-between items-center py-1 group">
                        {editingSkiId === ski.id ? (
                          // --- Edit Mode ---
                          <>
                            <input
                              type="text"
                              value={editedSkiName}
                              onChange={(e) => setEditedSkiName(e.target.value)}
                              className="flex-grow px-2 py-1 mr-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()} // Save on Enter
                              disabled={isUpdatingSki}
                            />
                            <div className="flex-shrink-0 space-x-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-50" onClick={handleSaveEdit} disabled={isUpdatingSki}>
                                {isUpdatingSki ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                <span className="sr-only">Save</span>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:bg-slate-100" onClick={handleCancelEdit} disabled={isUpdatingSki}>
                                <X className="h-4 w-4" />
                                <span className="sr-only">Cancel</span>
                              </Button>
                            </div>
                          </>
                        ) : (
                          // --- View Mode ---
                          <>
                            <span>{ski.name}</span>
                            <div className="space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => handleStartEdit(ski)}
                                disabled={isDeletingSki || isAddingSki || !!editingSkiId} // Disable if any other action is happening or editing another item
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                               <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteSki(ski.id)}
                                disabled={isDeletingSki || !!editingSkiId} // Disable if deleting or editing another item
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500 italic">No skis added yet</li>
                  )}

                </ol>
              )}
            </div>
            <form onSubmit={handleAddSkiSubmit} className="flex mt-4 gap-2 items-end">
              <div className="flex-grow">
                 <label htmlFor="new-ski-name" className="block text-sm font-medium text-slate-700 mb-1">Add New Ski</label>
                 <input
                   id="new-ski-name"
                   type="text"
                   placeholder="e.g., Volkl Racetiger SL"
                   className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
                   value={newSkiName}
                   onChange={(e) => setNewSkiName(e.target.value)}
                   disabled={isAddingSki}
                   required
                 />
              </div>
              <Button type="submit" className="h-10" disabled={isAddingSki}>
                {isAddingSki ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Placeholder for other settings sections */}
        {/*
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Profile photo and password change options here...</p>
          </CardContent>
        </Card>
        */}
      </div>
    </div>
  );
}
