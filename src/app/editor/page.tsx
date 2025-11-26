"use client";

import { Timeline } from "@/components/editor/Timeline/Timeline";
import { PropertyPanel } from "@/components/editor/PropertyPanel";

export default function EditorPage() {
    return (
        <div className="flex h-screen w-full bg-zinc-950 overflow-hidden">
            {/* Main Content Area (Preview + Timeline) */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Preview Area (Placeholder) */}
                <div className="flex-1 bg-zinc-900 flex items-center justify-center border-b border-zinc-800">
                    <div className="text-zinc-500">Preview Area (Coming Soon)</div>
                </div>

                {/* Timeline Area */}
                <div className="h-[400px] min-h-[300px] max-h-[600px] flex flex-col">
                    <Timeline />
                </div>
            </div>

            {/* Right Sidebar (Property Panel) */}
            <PropertyPanel />
        </div>
    );
}
