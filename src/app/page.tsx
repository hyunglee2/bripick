import EditorHeader from "@/components/editor/EditorHeader";
import ResumeCanvas from "@/components/editor/ResumeCanvas";
import InspectorPanel from "@/components/editor/InspectorPanel";

export default function HomePage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <EditorHeader />
      <div className="flex flex-1 overflow-hidden">
        <ResumeCanvas />
        <InspectorPanel />
      </div>
    </div>
  );
}
