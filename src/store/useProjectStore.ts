import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';

// ... (Interface definitions remain the same)

export interface Scene {
    id: number;
    text: string;
    audioUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
    imagePrompt?: string; // Image generation prompt (moved from localStorage)
}

export type AssetType = 'script' | 'audio' | 'image' | 'video' | 'sfx' | 'bgm';

export interface Asset {
    id: string;
    type: AssetType;
    url: string;
    thumbnail?: string;
    title: string;
    duration?: number;
    createdAt: string;
    sceneNumber?: number;
    tag?: string;
    storagePath?: string;
}

export interface Project {
    id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    scenes: Scene[];
    assets: Asset[];
    createdAt: string;
    updatedAt: string;
    type: 'script' | 'audio' | 'image' | 'video' | 'complete';
    mergedAudioUrl?: string;
}

interface ProjectState {
    currentProject: Project | null;
    projects: Project[];
    isLoading: boolean;

    // Actions
    loadProjects: () => Promise<void>;
    createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'scenes' | 'assets'>) => Promise<void>;
    loadProject: (id: string) => Promise<void>;
    saveCurrentProject: () => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    duplicateProject: (id: string) => Promise<void>;

    // Asset Actions
    addAsset: (asset: Omit<Asset, 'id' | 'createdAt'>) => Promise<void>;
    deleteAsset: (id: string) => Promise<void>;
    updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;

    // Local State Updates (Optimistic)
    setProject: (project: Project | null) => void;
    updateScenes: (scenes: Scene[]) => void;
    updateScene: (id: number, updates: Partial<Scene>) => void;
    updateProjectInfo: (updates: Partial<Omit<Project, 'id' | 'scenes'>>) => void;
}

const supabase = createClient();

export const useProjectStore = create<ProjectState>()(
    persist(
        (set, get) => ({
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

                const loadedProjects: Project[] = data.map(p => ({
                    id: p.id,
                    title: p.title,
                    description: p.description,
                    thumbnail: p.thumbnail,
                    type: p.type,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at,
                    scenes: [], // Scenes loaded on demand
                    assets: [] // Assets loaded on demand
                }));

                set({ projects: loadedProjects, isLoading: false });
            },

            createProject: async (projectData) => {
                set({ isLoading: true });

                // ✅ Get current user session
                const { data: { session }, error: authError } = await supabase.auth.getSession();

                if (authError || !session?.user) {
                    console.error('User not authenticated:', authError);
                    set({ isLoading: false });
                    throw new Error('User not authenticated');
                }

                const user = session.user;

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
                    console.error('Error creating project:', JSON.stringify(error, null, 2));
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
                    scenes: [],
                    assets: []
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

                // Fetch Assets
                const { data: assetsData, error: assetsError } = await supabase
                    .from('assets')
                    .select('*')
                    .eq('project_id', id)
                    .order('created_at', { ascending: false });

                if (assetsError) {
                    console.error('Error loading assets:', assetsError);
                    // Don't return, just log error and continue with empty assets
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
                        id: s.id,
                        text: s.text,
                        audioUrl: s.audio_url,
                        imageUrl: s.image_url,
                        videoUrl: s.video_url,
                        imagePrompt: s.image_prompt
                    })),
                    assets: assetsData ? assetsData.map(a => ({
                        id: a.id,
                        type: a.type as AssetType,
                        url: a.url,
                        title: a.title,
                        duration: a.duration,
                        createdAt: a.created_at,
                        sceneNumber: a.scene_number,
                        tag: a.tag,
                        storagePath: a.storage_path
                    })) : []
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
                        merged_audio_url: currentProject.mergedAudioUrl,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentProject.id);

                if (projectError) {
                    console.error('Error saving project info:', projectError);
                    return;
                }

                // Upsert Scenes
                const scenesToUpsert = currentProject.scenes.map((scene, index) => ({
                    project_id: currentProject.id,
                    scene_order: index,
                    text: scene.text,
                    audio_url: scene.audioUrl,
                    image_url: scene.imageUrl,
                    video_url: scene.videoUrl,
                    image_prompt: scene.imagePrompt
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
                        video_url: scene.video_url,
                        image_prompt: scene.image_prompt
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
                    scenes: [], // Scenes not loaded in list view
                    assets: []
                };

                set(state => ({
                    projects: [duplicatedProject, ...state.projects],
                    isLoading: false
                }));
            },

            addAsset: async (assetData) => {
                const { currentProject } = get();
                if (!currentProject) return;

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const newAsset = {
                    project_id: currentProject.id,
                    user_id: user.id,
                    type: assetData.type,
                    title: assetData.title,
                    url: assetData.url,
                    storage_path: assetData.storagePath,
                    scene_number: assetData.sceneNumber,
                    tag: assetData.tag,
                    duration: assetData.duration
                };

                const { data, error } = await supabase
                    .from('assets')
                    .insert(newAsset)
                    .select()
                    .single();

                if (error) {
                    console.error('Error adding asset:', error);
                    throw error;
                }

                const createdAsset: Asset = {
                    id: data.id,
                    type: data.type,
                    url: data.url,
                    title: data.title,
                    duration: data.duration,
                    createdAt: data.created_at,
                    sceneNumber: data.scene_number,
                    tag: data.tag,
                    storagePath: data.storage_path
                };

                set(state => ({
                    currentProject: state.currentProject ? {
                        ...state.currentProject,
                        assets: [createdAsset, ...state.currentProject.assets]
                    } : null
                }));
            },

            deleteAsset: async (id) => {
                const { currentProject } = get();
                if (!currentProject) return;

                // 1. Get asset to find storage path
                const asset = currentProject.assets.find(a => a.id === id);
                if (asset && asset.storagePath) {
                    // Delete from storage
                    const { error: storageError } = await supabase.storage
                        .from('assets') // Assuming bucket name is 'assets'
                        .remove([asset.storagePath]);

                    if (storageError) console.error('Error deleting from storage:', storageError);
                }

                // 2. Delete from DB
                const { error } = await supabase
                    .from('assets')
                    .delete()
                    .eq('id', id);

                if (error) {
                    console.error('Error deleting asset:', error);
                    throw error;
                }

                set(state => ({
                    currentProject: state.currentProject ? {
                        ...state.currentProject,
                        assets: state.currentProject.assets.filter(a => a.id !== id)
                    } : null
                }));
            },

            updateAsset: async (id, updates) => {
                const { currentProject } = get();
                if (!currentProject) return;

                // 1. Update in DB
                const { error } = await supabase
                    .from('assets')
                    .update({
                        title: updates.title,
                        url: updates.url,
                        // thumbnail: updates.thumbnail, // Column does not exist in DB
                        duration: updates.duration,
                        tag: updates.tag,
                        storage_path: updates.storagePath,
                        scene_number: updates.sceneNumber
                    })
                    .eq('id', id);

                if (error) {
                    console.error('Error updating asset:', error);
                    throw error;
                }

                // 2. Update local state
                set(state => ({
                    currentProject: state.currentProject ? {
                        ...state.currentProject,
                        assets: state.currentProject.assets.map(a =>
                            a.id === id ? { ...a, ...updates } : a
                        )
                    } : null
                }));
            },

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
        }),
        {
            name: 'project-storage', // unique name
            storage: createJSONStorage(() => localStorage),
            // ✅ Only persist project ID, not entire project (to avoid QuotaExceededError)
            // The actual project data is stored in Supabase
            partialize: (state) => ({
                currentProjectId: state.currentProject?.id
            }),
        }
    )
);
