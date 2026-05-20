import type { ProjectSummary } from "../../types/project";

interface ProjectListProps {
  projects: ProjectSummary[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
}

export function ProjectList({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenProject,
}: ProjectListProps) {
  return (
    <div className="oa-start-list-wrap">
      <div className="oa-start-list-head">
        <span>Name</span>
        <span>Last Opened</span>
      </div>
      <div className="oa-start-list" role="list">
        {projects.map((project) => (
          <button
            className={`oa-project-row ${
              project.id === selectedProjectId ? "is-selected" : ""
            }`}
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            onDoubleClick={() => onOpenProject(project.id)}
            type="button"
          >
            <span className="oa-project-main">
              <span className="oa-project-name">{project.name}</span>
              <span className="oa-project-path">{project.path}</span>
            </span>
            <span className="oa-project-date">{project.lastOpened}</span>
            <span className="oa-row-more">⋮</span>
          </button>
        ))}
      </div>
      <span className="oa-scroll-thumb" />
    </div>
  );
}
