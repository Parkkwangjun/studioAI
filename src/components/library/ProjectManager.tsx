import { useState } from 'react';
import { X, FolderPlus, FolderOpen, Search, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProjectStore } from '@/store/useProjectStore'; // Assuming this store exists

interface ProjectManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProjectManager({ isOpen, onClose }: ProjectManagerProps) {
    const { projects, currentProject, loadProject, createProject, deleteProject } = useProjectStore();
    const [activeTab, setActiveTab] = useState<'open' | 'new'>('open');
    const [searchQuery, setSearchQuery] = useState('');
    const [newProjectTitle, setNewProjectTitle] = useState('');

    if (!isOpen) return null;

    const filteredProjects = projects.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = async () => {
        if (!newProjectTitle.trim()) return;
        await createProject({
            title: newProjectTitle,
            description: '',
            type: 'script', // Default type
        });
        setNewProjectTitle('');
        setActiveTab('open');
    };

    const handleOpen = (projectId: string) => {
        loadProject(projectId);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-3xl bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#27272a]">
                    <h2 className="text-xl font-bold text-white">Project Manager</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#27272a]">
                    <button
                        onClick={() => setActiveTab('open')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'open'
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FolderOpen className="w-4 h-4" />
                            Open Existing Project
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'new'
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FolderPlus className="w-4 h-4" />
                            Create New Project
                        </div>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-6">
                    {activeTab === 'open' ? (
                        <div className="flex flex-col h-full">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                    placeholder="Search projects..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {filteredProjects.map(project => (
                                    <div
                                        key={project.id}
                                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${currentProject?.id === project.id
                                                ? 'bg-primary/10 border-primary/50'
                                                : 'bg-[#27272a] border-transparent hover:border-gray-600'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0 mr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium text-white truncate">{project.title}</h4>
                                                {currentProject?.id === project.id && (
                                                    <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full">Active</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                Last modified: {new Date(project.updatedAt || Date.now()).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant={currentProject?.id === project.id ? "secondary" : "primary"}
                                                onClick={() => handleOpen(project.id)}
                                            >
                                                {currentProject?.id === project.id ? 'Current' : 'Open'}
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="text-gray-400 hover:text-red-400"
                                                onClick={() => {
                                                    if (confirm('Delete this project?')) deleteProject(project.id);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full max-w-md mx-auto justify-center">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                                    <FolderPlus className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Start a New Project</h3>
                                <p className="text-gray-400 text-sm">Create a new workspace for your creative assets.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Project Name</label>
                                    <Input
                                        placeholder="e.g., My Awesome Video"
                                        value={newProjectTitle}
                                        onChange={(e) => setNewProjectTitle(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <Button
                                    className="w-full h-12 text-lg"
                                    onClick={handleCreate}
                                    disabled={!newProjectTitle.trim()}
                                >
                                    Create Project
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
