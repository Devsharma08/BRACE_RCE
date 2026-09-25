import React, { useState, useMemo } from "react";
import { CheckCircle2, LockKeyhole, ArrowLeft, ArrowRight, Search, Clock, Target, Lock, BookOpen } from "lucide-react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../config/api";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { toast } from "sonner";

interface LearningItem {
  id: string;
  name: string;
  order: number;
  category: string;
  description: string | null;
  problemIds: string[];
  prerequisites: string[];
  nextStructures: string[];
  progress: { progressStatus: string; lastVisited: string | null } | null;
  prerequisitesDetails: { id: string; name: string; order: number }[];
  nextStructuresDetails: { id: string; name: string; order: number }[];
}

interface LearningPathsResponse {
  status: string;
  items: LearningItem[];
  summary: { completedCount: number; lastUpdated: string | null };
}

const LearningPaths: React.FC = () => {
  const { id: pathId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, error } = useQuery<LearningPathsResponse>({
    queryKey: ["learning-paths"],
    queryFn: async () => {
      const res = await api.get("/learning-paths");
      return res.data;
    },
  });

  const items = data?.items || [];
  const summary = data?.summary;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesStatus = !statusFilter || item.progress?.progressStatus === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  const currentItem = useMemo(() => {
    if (!pathId) return null;
    return items.find((item) => item.id === pathId);
  }, [items, pathId]);

  const completedIds = useMemo(() => {
    return new Set(items.filter((i) => i.progress?.progressStatus === "COMPLETED").map((i) => i.id));
  }, [items]);

  const recommendations = useMemo(() => {
    if (!currentItem) return [];
    return currentItem.nextStructures
      .filter((topic) => !completedIds.has(topic))
      .filter((topic) => {
        const topicItem = items.find((i) => i.name === topic || i.id === topic);
        if (!topicItem) return true;
        return topicItem.prerequisites.every((p) => completedIds.has(p));
      })
      .map((topic) => items.find((i) => i.name === topic || i.id === topic))
      .filter(Boolean);
  }, [currentItem, items, completedIds]);

  const { previousItem, nextItem } = useMemo(() => {
    if (!currentItem) return { previousItem: null, nextItem: null };
    const idx = items.findIndex((i) => i.id === currentItem.id);
    return {
      previousItem: idx > 0 ? items[idx - 1] : null,
      nextItem: idx < items.length - 1 ? items[idx + 1] : null,
    };
  }, [currentItem, items]);

  const handleMarkProgress = async (itemId: string, status: "IN_PROGRESS" | "COMPLETED") => {
    try {
      await api.post(`/learning-paths/${itemId}/progress`, { progressStatus: status });
      queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      toast.success(`Progress updated: ${status}`);
    } catch {
      toast.error("Failed to update progress");
    }
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      Fundamentals: "text-accent-warning",
      "Linear Data Structures": "text-accent-primary",
      "Non-Linear Data Structures": "text-accent-success",
      "Advanced Data Structures": "text-accent-violet",
    };
    return colors[cat] || "text-faint";
  };

  const getStatusIcon = (status?: string) => {
    if (status === "COMPLETED") return <CheckCircle2 className="w-4 h-4" />;
    if (status === "IN_PROGRESS") return <Lock className="w-4 h-4" />;
    return <LockKeyhole className="w-4 h-4" />;
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-base"><div className="animate-spin rounded-full h-12 w-12 border-4 border-accent-primary border-t-transparent" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-screen bg-base"><div className="text-center"><h2 className="text-2xl font-bold">Failed to load</h2></div></div>;

  return (
    <div className="flex min-h-screen bg-base text-fg font-mono relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] z-0" />
      <DashboardSidebar rating={undefined} />
      <MobileBottomNav />
      <main className="flex-1 min-w-0 w-full ml-0 md:ml-[var(--sidebar-width)] pt-14 px-4 py-6 md:px-8 md:py-8 pb-20 md:pb-8 flex flex-col gap-6">
        <header className="flex flex-col justify-between gap-5 border-b border-subtle-line pb-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-accent-primary">
              <BookOpen size={13} /><span>LEARNING PATHS</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Master Data <span className="text-accent-primary">Structures</span></h1>
            <p className="text-xs text-subtle leading-relaxed max-w-xl">Follow structured learning paths to master data structures.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-widest">
            <span className="border border-accent-primary/25 bg-accent-primary/5 px-2.5 py-1.5 text-accent-primary">Total <strong className="ml-1 text-fg">{items.length}</strong></span>
            <span className="border border-accent-success/25 bg-accent-success/5 px-2.5 py-1.5 text-accent-success">Completed <strong className="ml-1 text-fg">{summary?.completedCount ?? 0}</strong></span>
          </div>
        </header>

        {currentItem && pathId && (
          <section className="rounded-card border border-subtle-line bg-surface overflow-hidden">
            <div className="flex flex-col gap-4 p-6 bg-accent-primary/5 border-b border-subtle-line">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-accent-primary" />
                  <span className="text-[10px] uppercase tracking-widest text-accent-primary font-bold">Current Learning Path</span>
                </div>
                {previousItem && (
                  <button onClick={() => navigate(`/learning-paths/${previousItem.id}`)} className="flex items-center gap-2 px-4 py-2 border border-subtle-line rounded-lg hover:bg-accent-primary/10">
                    <ArrowLeft size={16} className="text-accent-primary" /><span className="text-xs text-fg">{previousItem.name}</span>
                  </button>
                )}
              </div>
              <div className="flex items-start gap-4 mt-4">
                <div className="h-12 w-12 rounded-full border-2 border-accent-primary/30 flex items-center justify-center bg-accent-primary/10">
                  <span className="text-xl font-bold text-accent-primary">{currentItem.order}</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-fg">{currentItem.name}</h2>
                  <p className="text-sm text-subtle mt-1">{currentItem.category}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] uppercase tracking-widest bg-raised px-2 py-1 rounded border border-subtle-line">{currentItem.progress?.progressStatus || "NOT_STARTED"}</span>
                    {currentItem.progress?.lastVisited && <span className="text-[10px] text-faint flex items-center gap-1"><Clock size={10} />{new Date(currentItem.progress.lastVisited).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
              {currentItem.description && <p className="text-sm text-subtle leading-relaxed">{currentItem.description}</p>}

              {currentItem.prerequisites.length > 0 && (
                <div className="border-t border-subtle-line pt-4">
                  <h3 className="text-xs uppercase tracking-widest text-faint font-bold mb-3">Prerequisites</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentItem.prerequisitesDetails.map((prereq) => (
                      <Link key={prereq.id} to={`/learning-paths/${prereq.id}`} className="flex items-center gap-2 px-3 py-1.5 border border-subtle-line rounded-lg hover:bg-accent-primary/10">
                        <LockKeyhole size={14} className="text-faint" /><span className="text-xs text-fg">{prereq.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {currentItem.nextStructures.length > 0 && (
                <div className="border-t border-subtle-line pt-4">
                  <h3 className="text-xs uppercase tracking-widest text-faint font-bold mb-3">Next Structures</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentItem.nextStructuresDetails.map((next) => {
                      const isCompleted = completedIds.has(next.id);
                      return (
                        <Link key={next.id} to={isCompleted ? `/learning-paths/${next.id}` : "#"} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg ${isCompleted ? "border-accent-success/30 bg-accent-success/10" : "border-subtle-line bg-raised"}`}>
                          {isCompleted ? <CheckCircle2 size={14} className="text-accent-success" /> : <Lock size={14} className="text-faint" />}
                          <span className={`text-xs ${isCompleted ? "text-accent-success" : "text-fg"}`}>{next.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {recommendations.length > 0 && (
                <div className="border-t border-subtle-line pt-4">
                  <h3 className="text-xs uppercase tracking-widest text-accent-primary font-bold mb-3">Recommended Next</h3>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.map((rec) => (
                      <Link key={rec?.id} to={`/learning-paths/${rec?.id}`} className="flex items-center gap-2 px-3 py-1.5 border border-accent-primary/30 bg-accent-primary/10 rounded-lg">
                        <Target size={14} className="text-accent-primary" /><span className="text-xs text-accent-primary font-bold">{rec?.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                {currentItem.progress?.progressStatus !== "COMPLETED" && (
                  <>
                    <button onClick={() => handleMarkProgress(currentItem.id, "IN_PROGRESS")} className="flex items-center gap-2 px-4 py-2 border border-accent-warning/30 bg-accent-warning/10 rounded-lg">
                      <Lock className="w-4 h-4 text-accent-warning" /><span className="text-xs text-accent-warning font-bold">Start Learning</span>
                    </button>
                    <button onClick={() => handleMarkProgress(currentItem.id, "COMPLETED")} className="flex items-center gap-2 px-4 py-2 border border-accent-success/30 bg-accent-success/10 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-accent-success" /><span className="text-xs text-accent-success font-bold">Mark Complete</span>
                    </button>
                  </>
                )}
                {currentItem.progress?.progressStatus === "COMPLETED" && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-accent-success/10 border border-accent-success/30 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-accent-success" /><span className="text-xs text-accent-success font-bold">Completed</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-raised border-t border-subtle-line">
              {previousItem ? (
                <button onClick={() => navigate(`/learning-paths/${previousItem.id}`)} className="flex items-center gap-2 px-4 py-2 border border-subtle-line rounded-lg">
                  <ArrowLeft size={16} className="text-accent-primary" /><div><span className="text-xs font-bold">Previous</span><p className="text-xs text-fg">{previousItem.name}</p></div>
                </button>
              ) : <div />}
              {nextItem && (
                <button onClick={() => navigate(`/learning-paths/${nextItem.id}`)} className="flex items-center gap-2 px-4 py-2 border border-subtle-line rounded-lg">
                  <div><span className="text-xs font-bold">Next</span><p className="text-xs text-fg">{nextItem.name}</p></div>
                  <ArrowRight size={16} className="text-accent-primary" />
                </button>
              )}
            </div>
          </section>
        )}

        {!pathId && (
          <>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
                <input type="text" placeholder="Search learning paths..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 pl-10 pr-4 bg-raised border border-subtle-line rounded-lg text-sm outline-none focus:border-accent-primary" />
              </div>
              <div className="flex gap-2">
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 px-4 bg-raised border border-subtle-line rounded-lg text-sm outline-none">
                  <option value="">All Categories</option>
                  {Array.from(new Set(items.map((i) => i.category))).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-4 bg-raised border border-subtle-line rounded-lg text-sm outline-none">
                  <option value="">All Status</option>
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
            <div className="text-xs text-faint font-mono">{filteredItems.length} learning path{filteredItems.length !== 1 ? "s" : ""} found</div>
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <Link key={item.id} to={`/learning-paths/${item.id}`} className={`rounded-card border p-4 transition-all ${item.progress?.progressStatus === "COMPLETED" ? "border-accent-success/30 bg-accent-success/5" : item.progress?.progressStatus === "IN_PROGRESS" ? "border-accent-warning/30 bg-accent-warning/5" : "border-subtle-line bg-surface hover:border-accent-primary/30"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] uppercase tracking-widest font-bold ${getCategoryColor(item.category)}`}>{item.category}</span>
                      {getStatusIcon(item.progress?.progressStatus)}
                    </div>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="h-8 w-8 rounded-full bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-sm font-bold text-accent-primary">{item.order}</span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold">{item.name}</h3>
                        <p className="text-[9px] text-faint mt-0.5">{item.progress?.progressStatus || "Not Started"}</p>
                      </div>
                    </div>
                    {item.description && <p className="text-xs text-subtle line-clamp-2 mb-3">{item.description}</p>}
                    <div className="flex items-center justify-between text-[9px] text-faint">
                      <span>{item.prerequisites.length} prereq</span>
                      <span>{item.nextStructures.length} next</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-subtle-line bg-surface-hover text-faint text-xs">// NO_LEARNING_PATHS_FOUND</div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default LearningPaths;
