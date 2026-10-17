import BripickLoadingLogo from "@/components/ui/BripickLoadingLogo";

export default function Loading() {
    return (
        <div className="app-loading-screen">
            <BripickLoadingLogo label="Bripick을 불러오는 중…" />
        </div>
    );
}
