'use client';

import { Settings, ChevronDown, Plus, Search, Trash2, Copy, FolderOpen, FileText, Image, Video, Music, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProjectStore, Project } from '@/store/useProjectStore';
import { useRouter, usePathname } from 'next/navigation';
import { ImagePreviewModal } from '@/components/image/ImagePreviewModal';

export function LibraryPanel() {
    const { projects, currentProject, loadProject, deleteProject, duplicateProject, createProject, loadProjects, isLoading } = useProjectStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'script' | 'audio' | 'image' | 'video' | 'complete'>('all');
    const [previewImage, setPreviewImage] = useState<{ url: string; prompt: string; project: Project } | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    if (pathname === '/login') return null;

    // Load projects on mount
    useEffect(() => {
        loadProjects();
    }, []);

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || project.type === filterType;
        return matchesSearch && matchesFilter;
    });

    const handleCreateNew = async () => {
        try {
            await createProject({
                title: 'New Project',
                description: '',
                type: 'script',
                thumbnail: undefined
            });
            router.push('/script');
        } catch (error) {
            console.error('Failed to create project:', error);
        }
    };

    const navigateToProject = (project: Project) => {
        loadProject(project.id);
        const routes: Record<Project['type'], string> = {
            'script': '/script',
            'audio': '/audio',
            'image': '/image',
            'video': '/video',
            'complete': '/video'
        };
        router.push(routes[project.type]);
    };

    const handleLoadProject = (project: Project) => {
        if (project.type === 'image' && project.thumbnail) {
            setPreviewImage({
                url: project.thumbnail,
                prompt: project.scenes[0]?.text || project.title,
                project: project
            });
        } else {
            navigateToProject(project);
        }
    };

    const handleDelete = (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        if (confirm('정말 이 프로젝트를 삭제하시겠습니까?')) {
            deleteProject(projectId);
        }
    };

    const handleDuplicate = (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        duplicateProject(projectId);
    };

    const getProjectIcon = (type: Project['type']) => {
        const icons = {
            'script': <FileText className="w-3 h-3" />,
            'audio': <Music className="w-3 h-3" />,
            'image': <Image className="w-3 h-3" />,
            'video': <Video className="w-3 h-3" />,
            'complete': <Video className="w-3 h-3" />
        };
        return icons[type];
    };

    const getProjectColor = (type: Project['type']) => {
        const colors = {
            'script': 'bg-[#5b3dad]',
            'audio': 'bg-[#ad3d5b]',
            'image': 'bg-[#1d4ed8]',
            'video': 'bg-[#059669]',
            'complete': 'bg-[#d97706]'
        };
        return colors[type];
    };

    const getProjectLabel = (type: Project['type']) => {
        const labels = {
            'script': '스크립트',
            'audio': '오디오',
            'image': '이미지',
            'video': '비디오',
            'complete': '완료'
        };
        return labels[type];
    };

    return (
        <aside className="w-[300px] bg-[var(--bg-sidebar)] border-l border-[#2a2a35] p-[25px] flex flex-col h-full shrink-0">
            {/* Header */}
            <div className="mb-5 flex justify-between items-center">
                <h3 className="text-[1.1rem] font-semibold text-white">Library</h3>
                <button className="text-[var(--text-gray)] hover:text-white transition-colors">
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-gray)]" />
                <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#15151e] border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-[var(--text-gray)] outline-none focus:border-[var(--primary-color)] transition-colors"
                />
            </div>

            {/* Filter Dropdown (Transparent Select) */}
            <div className="mb-4 relative">
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full appearance-none bg-transparent border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-gray)] outline-none focus:border-[var(--primary-color)] focus:text-white transition-colors cursor-pointer"
                >
                    <option value="all" className="bg-[#15151e]">전체 프로젝트</option>
                    <option value="script" className="bg-[#15151e]">스크립트</option>
                    <option value="audio" className="bg-[#15151e]">오디오</option>
                    <option value="image" className="bg-[#15151e]">이미지</option>
                    <option value="video" className="bg-[#15151e]">비디오</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-gray)] pointer-events-none" />
            </div>

            {/* New Project Button */}
            <button
                onClick={handleCreateNew}
                className="w-full bg-[var(--primary-color)] hover:bg-[#4a4ddb] text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors mb-5"
            >
                <Plus className="w-4 h-4" />
                New Project
            </button>

            {/* Projects Grid */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {filteredProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-gray)] py-8">
                        <FolderOpen className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm">
                            {searchQuery ? 'No projects found' : 'No projects yet'}
                        </p>
                        <p className="text-xs mt-1">
                            {searchQuery ? 'Try a different search' : 'Create your first project'}
                        </p>
                    </div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-gray)]">
                        <div className="w-6 h-6 border-2 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-xs">Loading projects...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredProjects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => handleLoadProject(project)}
                                className={`bg-[#262633] rounded-lg overflow-hidden border transition-all cursor-pointer group ${currentProject?.id === project.id
                                    ? 'border-[var(--primary-color)] ring-1 ring-[var(--primary-color)]'
                                    : 'border-[var(--border-color)] hover:border-[var(--text-gray)]'
                                    }`}
                            >
                                {/* Thumbnail */}
                                <div className="h-20 bg-[#323242] relative overflow-hidden">
                                    {project.thumbnail ? (
                                        <img
                                            src={project.thumbnail}
                                            alt={project.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-slate-900/20 flex flex-col justify-center p-2.5 gap-1.5">
                                            <div className="h-1 bg-[#4d4d5e] rounded-sm w-[80%]"></div>
                                            <div className="h-1 bg-[#4d4d5e] rounded-sm w-[80%]"></div>
                                            <div className="h-1 bg-[#4d4d5e] rounded-sm w-[50%]"></div>
                                        </div>
                                    )}

                                    {/* Actions (show on hover) */}
                                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleDuplicate(e, project.id)}
                                            className="p-1 bg-black/50 hover:bg-black/70 rounded backdrop-blur-sm"
                                            title="Duplicate"
                                        >
                                            <Copy className="w-3 h-3 text-white" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, project.id)}
                                            className="p-1 bg-black/50 hover:bg-red-500/70 rounded backdrop-blur-sm"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-2">
                                    <p className="text-xs font-medium text-white truncate mb-1.5">
                                        {project.title}
                                    </p>
                                    <div className="flex justify-between items-center text-[0.65rem]">
                                        <span className={`px-1.5 py-0.5 rounded ${getProjectColor(project.type)} text-white flex items-center gap-1`}>
                                            {getProjectIcon(project.type)}
                                            {getProjectLabel(project.type)}
                                        </span>
                                        <span className="text-[var(--text-gray)]">
                                            {project.scenes.length} scenes
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="mt-5 pt-4 border-t border-[var(--border-color)] text-xs text-[var(--text-gray)]">
                <div className="flex justify-between">
                    <span>Total Projects</span>
                    <span className="font-medium text-white">{projects.length}</span>
                </div>
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <ImagePreviewModal
                    isOpen={!!previewImage}
                    onClose={() => setPreviewImage(null)}
                    imageUrl={previewImage.url}
                    prompt={previewImage.prompt}
                />
            )}
        </aside>
    );
}
