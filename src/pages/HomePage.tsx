import { useMemo, useState } from "react";
import { ProjectList } from "../components/start/ProjectList";
import type { ProjectSummary } from "../types/project";

interface HomePageProps {
  projects: ProjectSummary[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenSettings: () => void;
}

export function HomePage({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenProject,
  onOpenSettings,
}: HomePageProps) {
  const [query, setQuery] = useState("");
  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return projects;
    }

    return projects.filter((project) =>
      `${project.name} ${project.path}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [projects, query]);

  return (
    <main className="oa-start">
      <div className="oa-titlebar">
        <div className="oa-title">Open Audition</div>
        <div className="oa-subtitle" />
      </div>
      <section className="oa-start-body">
        <div className="oa-start-toolbar">
          <div className="oa-start-actions">
            <button
              className="oa-action"
              type="button"
              onClick={() => onOpenProject(selectedProjectId)}
              onMouseDown={() => onOpenProject(selectedProjectId)}
            >
              New Project
            </button>
            <button
              className="oa-action"
              type="button"
              onClick={() => onOpenProject(selectedProjectId)}
              onMouseDown={() => onOpenProject(selectedProjectId)}
            >
              Open
            </button>
            <button className="oa-action" type="button">
              Import Project...
            </button>
            <button
              className="oa-more-button"
              type="button"
              onClick={onOpenSettings}
              onMouseDown={onOpenSettings}
            >
              ⋮
            </button>
          </div>
          <label className="oa-start-search">
            <span className="oa-search-icon" />
            <input
              aria-label="Search projects"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search projects"
              type="search"
              value={query}
            />
          </label>
        </div>
        <ProjectList
          onOpenProject={onOpenProject}
          onSelectProject={onSelectProject}
          projects={visibleProjects}
          selectedProjectId={selectedProjectId}
        />
      </section>
    </main>
  );
}
