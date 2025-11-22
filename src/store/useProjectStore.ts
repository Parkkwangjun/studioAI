import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export interface Scene {
    id: number;
    text: string;
    audioUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
}

export interface Project {
    id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    scenes: Scene[];
    createdAt: string;
    updatedAt: string;
    type: 'script' | 'audio' | 'image' | 'video' | 'complete';
}

interface ProjectState {
    currentProject: Project | null;
    projects: Project[];
    isLoading: boolean;

    // Actions
    loadProjects: () => Promise<void>;
    createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'scenes'>) => Promise<void>;
    loadProject: (id: string) => Promise<void>;
    saveCurrentProject: () => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    duplicateProject: (id: string) => Promise<void>;

    // Local State Updates (Optimistic)
    setProject: (project: Project | null) => void;
    updateScenes: (scenes: Scene[]) => void;
    updateScene: (id: number, updates: Partial<Scene>) => void;
    updateProjectInfo: (updates: Partial<Omit<Project, 'id' | 'scenes'>>) => void;
}

const supabase = createClient();

export const useProjectStore = create<ProjectState>((set, get) => ({
    currentProject: null,
    projects: [],
    isLoading: false,

    loadProjects: async () => {
        set({ isLoading: true });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            set({ projects: [], isLoading: false });
            return;
        }

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error loading projects:', error);
            set({ isLoading: false });
            return;
        }

        // Transform DB data to App state (if needed)
        // Assuming DB columns match Project interface mostly
        // We need to fetch scenes for each project? No, usually just project list first.
        // But our Project interface includes scenes. 
        // For the list view, we might not need scenes, but let's keep it simple.
        // We'll fetch scenes only when loading a specific project.

        const loadedProjects: Project[] = data.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            thumbnail: p.thumbnail,
            type: p.type,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            scenes: [] // Scenes loaded on demand
        }));

        set({ projects: loadedProjects, isLoading: false });
    },

    createProject: async (projectData) => {
        set({ isLoading: true });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const newProject = {
            user_id: user.id,
            title: projectData.title,
            description: projectData.description,
            thumbnail: projectData.thumbnail,
            type: projectData.type,
        };

        const { data, error } = await supabase
            .from('projects')
            .insert(newProject)
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            set({ isLoading: false });
            throw error;
        }

        const createdProject: Project = {
            id: data.id,
            title: data.title,
            description: data.description,
            thumbnail: data.thumbnail,
            type: data.type,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            scenes: []
        };

        set(state => ({
            projects: [createdProject, ...state.projects],
            currentProject: createdProject,
            isLoading: false
        }));
    },

    loadProject: async (id) => {
        set({ isLoading: true });

        // Fetch Project
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (projectError) {
            console.error('Error loading project:', projectError);
            set({ isLoading: false });
            return;
        }

        // Fetch Scenes
        const { data: scenesData, error: scenesError } = await supabase
            .from('scenes')
            .select('*')
            .eq('project_id', id)
            .order('scene_order', { ascending: true });

        if (scenesError) {
            console.error('Error loading scenes:', scenesError);
            set({ isLoading: false });
            return;
        }

        const fullProject: Project = {
            id: projectData.id,
            title: projectData.title,
            description: projectData.description,
            thumbnail: projectData.thumbnail,
            type: projectData.type,
            createdAt: projectData.created_at,
            updatedAt: projectData.updated_at,
            scenes: scenesData.map(s => ({
                id: s.id, // Note: DB id is number (bigint), App id is number. Matches.
                text: s.text,
                audioUrl: s.audio_url,
                imageUrl: s.image_url,
                videoUrl: s.video_url
            }))
        };

        set({ currentProject: fullProject, isLoading: false });
    },

    saveCurrentProject: async () => {
        const { currentProject } = get();
        if (!currentProject) return;

        // Update Project Info
        const { error: projectError } = await supabase
            .from('projects')
            .update({
                title: currentProject.title,
                description: currentProject.description,
                thumbnail: currentProject.thumbnail,
                type: currentProject.type,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentProject.id);

        if (projectError) {
            console.error('Error saving project info:', projectError);
            return;
        }

        // Upsert Scenes
        // Strategy: Delete all scenes and re-insert? Or Upsert?
        // Re-inserting is safer for order but heavier. 
        // Let's try Upsert. We need to map App Scene to DB Scene.

        const scenesToUpsert = currentProject.scenes.map((scene, index) => ({
            // If id is temporary (generated by Date.now()), we might have issues if we try to upsert with it?
            // Actually, in the new DB flow, we should let DB handle IDs for new scenes.
            // But our app relies on IDs for keying. 
            // For now, let's assume we delete all and re-insert for simplicity and correctness of order.
            // Optimization: Only update changed scenes.

            // Simple approach: Delete all scenes for this project and re-insert.
            project_id: currentProject.id,
            scene_order: index,
            text: scene.text,
            audio_url: scene.audioUrl,
            image_url: scene.imageUrl,
            video_url: scene.videoUrl
        }));

        // Delete existing scenes
        await supabase.from('scenes').delete().eq('project_id', currentProject.id);

        // Insert new scenes
        const { error: scenesError } = await supabase
            .from('scenes')
            .insert(scenesToUpsert);

        if (scenesError) {
            console.error('Error saving scenes:', scenesError);
        } else {
            console.log('Project saved successfully');
        }
    },

    deleteProject: async (id) => {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting project:', error);
            return;
        }

        set(state => ({
            projects: state.projects.filter(p => p.id !== id),
            currentProject: state.currentProject?.id === id ? null : state.currentProject
        }));
    },

    duplicateProject: async (id) => {
        set({ isLoading: true });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch original project
        const { data: originalProject, error: fetchError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !originalProject) {
            console.error('Error fetching project to duplicate:', fetchError);
            set({ isLoading: false });
            return;
        }

        // 2. Create new project
        const newProjectData = {
            user_id: user.id,
            title: `${originalProject.title} (Copy)`,
            description: originalProject.description,
            thumbnail: originalProject.thumbnail,
            type: originalProject.type,
        };

        const { data: newProject, error: createError } = await supabase
            .from('projects')
            .insert(newProjectData)
            .select()
            .single();

        if (createError || !newProject) {
            console.error('Error creating duplicated project:', createError);
            set({ isLoading: false });
            return;
        }

        // 3. Fetch original scenes
        const { data: originalScenes } = await supabase
            .from('scenes')
            .select('*')
            .eq('project_id', id);

        if (originalScenes && originalScenes.length > 0) {
            // 4. Insert copied scenes
            const scenesToInsert = originalScenes.map(scene => ({
                project_id: newProject.id,
                scene_order: scene.scene_order,
                text: scene.text,
                audio_url: scene.audio_url,
                image_url: scene.image_url,
                video_url: scene.video_url
            }));

            await supabase.from('scenes').insert(scenesToInsert);
        }

        // 5. Update local state
        const duplicatedProject: Project = {
            id: newProject.id,
            title: newProject.title,
            description: newProject.description,
            thumbnail: newProject.thumbnail,
            type: newProject.type,
            createdAt: newProject.created_at,
            updatedAt: newProject.updated_at,
            scenes: [] // Scenes not loaded in list view
        };

        set(state => ({
            projects: [duplicatedProject, ...state.projects],
            isLoading: false
        }));
    },

    // Local State Updates (Same as before)
    setProject: (project) => set({ currentProject: project }),

    updateScenes: (scenes) => set((state) => ({
        currentProject: state.currentProject
            ? { ...state.currentProject, scenes, updatedAt: new Date().toISOString() }
            : null
    })),

    updateScene: (id, updates) => set((state) => {
        if (!state.currentProject) return {};

        const newScenes = state.currentProject.scenes.map(scene =>
            scene.id === id ? { ...scene, ...updates } : scene
        );

        return {
            currentProject: {
                ...state.currentProject,
                scenes: newScenes,
                updatedAt: new Date().toISOString()
            }
        };
    }),

    updateProjectInfo: (updates) => set((state) => {
        if (!state.currentProject) return {};
        return {
            currentProject: {
                ...state.currentProject,
                ...updates,
                updatedAt: new Date().toISOString()
            }
        };
    }),
}));
