import { useEffect, useMemo, useState } from 'react';
import { INITIAL_STUDIO_STATE } from './data/seedData';
import type {
  ActiveRoute,
  BrandAsset,
  BrandEvidence,
  BrandFontRule,
  BrandGuideline,
  BrandGuidelineVersion,
  BrandSwatch,
  BrandWorkspace,
  BriefItem,
  ClientRecord,
  CreativeConcept,
  CreativeDirection,
  Language,
  Role,
  SocialContent,
  SocialContentStatus,
  SocialPlatform,
  StudioBoard,
  StudioStoreState,
  SystemConfig,
  VideoDeliverable,
  VisualAudit,
  WalletTransaction,
} from './types/studio';
import { loadStoreWithSafeMigration, saveStoreSafely } from './utils/storageMigration';
import { getApprovedGuidelineVersion } from './utils/brandLogic';
import { initDriveAuth, signInGoogleDrive, signOutGoogleDrive } from './services/driveAuth';
import { LayoutShell } from './components/LayoutShell';
import { WorkshopView } from './components/WorkshopView';
import { DompetView } from './components/DompetView';
import { BriefView } from './components/BriefView';
import { StudioView } from './components/StudioView';
import { VideoReviewView } from './components/VideoReviewView';
import { AdminHelpView } from './components/AdminHelpView';
import { BrandWorkspaceView } from './components/BrandWorkspaceView';
import { BrandIntelligenceView } from './components/BrandIntelligenceView';
import { BrandGuidelinesView } from './components/BrandGuidelinesView';
import { CreativeDirectionView } from './components/CreativeDirectionView';
import { SocialMediaStudioView } from './components/SocialMediaStudioView';
import { VisualCheckerView } from './components/VisualCheckerView';
import { BrandReportsView } from './components/BrandReportsView';
import { WebsiteHubView } from './components/WebsiteHubView';
import type { ScheduleResult } from './utils/preluxesSchedule';
import { PRELUXES_CLIENT_ID, PRELUXES_WORKSPACE_ID } from './data/preluxesSeed';

export default function App() {
  const [state, setState] = useState<StudioStoreState>(() =>
    loadStoreWithSafeMigration(INITIAL_STUDIO_STATE)
  );
  const [activeRoute, setActiveRoute] = useState<ActiveRoute>('workshop');
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);
  const [driveNotice, setDriveNotice] = useState<string | null>(null);

  useEffect(() => {
    saveStoreSafely(state);
  }, [state]);

  useEffect(() => {
    const unsub = initDriveAuth(
      (user, hasToken) => {
        setDriveConnected(hasToken);
        setDriveUserEmail(hasToken ? user.email : null);
      },
      () => {
        setDriveConnected(false);
        setDriveUserEmail(null);
      }
    );
    return () => unsub();
  }, []);

  const activeUser = useMemo(
    () => state.users.find((u) => u.id === state.activeUserId) ?? state.users[0],
    [state.users, state.activeUserId]
  );

  const handleGoogleSignIn = async () => {
    setDriveNotice(null);
    try {
      const { user } = await signInGoogleDrive();
      setDriveConnected(true);
      setDriveUserEmail(user.email);
    } catch (err: unknown) {
      setDriveNotice(err instanceof Error ? err.message : 'Google Sign-In dibatalkan atau gagal.');
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogleDrive();
    setDriveConnected(false);
    setDriveUserEmail(null);
  };

  const handleSwitchUser = (userId: string) => {
    const targetUser = state.users.find((u) => u.id === userId);
    if (!targetUser) return;
    setState((prev) => {
      const nextClientId =
        targetUser.role === 'ADMIN' ||
        targetUser.assignedClientIds.length === 0 ||
        targetUser.assignedClientIds.includes(prev.activeClientId)
          ? prev.activeClientId
          : targetUser.assignedClientIds[0];
      return { ...prev, activeUserId: userId, activeClientId: nextClientId };
    });
  };

  const handleAddTransaction = (tx: WalletTransaction) => {
    setState((prev) => ({
      ...prev,
      walletTransactions: [tx, ...prev.walletTransactions],
    }));
  };

  const handleMarkTransactionPaid = (txId: string) => {
    setState((prev) => ({
      ...prev,
      walletTransactions: prev.walletTransactions.map((t) =>
        t.id === txId ? { ...t, status: 'PAID' } : t
      ),
    }));
  };

  const handleAddBrief = (brief: BriefItem) => {
    setState((prev) => ({
      ...prev,
      briefs: [brief, ...prev.briefs],
    }));
  };

  const handleSendBriefToStudio = (brief: BriefItem) => {
    const existing = state.studioBoards.find((b) => b.briefId === brief.id);
    if (!existing) {
      const ch = state.channels.find((c) => c.id === brief.channelId) ?? state.channels[0];
      const approved = getApprovedGuidelineVersion(state.guidelines[brief.brandId]);
      const newBoard: StudioBoard = {
        id: `stb-${Date.now().toString(36)}`,
        clientId: brief.clientId,
        brandId: brief.brandId,
        channelId: brief.channelId,
        briefId: brief.id,
        title: `Studio: ${brief.title}`,
        locks: {
          characterLock: true,
          characterRef: ch.characterLockPreset,
          setLock: false,
          setRef: '',
          styleLock: true,
          styleRef: ch.visualStyle,
          productLock: false,
          productRef: '',
          brandLock: Boolean(approved),
          logoLock: Boolean(approved),
          typographyLock: Boolean(approved),
          visualIdentityLock: Boolean(approved),
        },
        scenes: [
          {
            id: `scn-${Date.now().toString(36)}`,
            sceneNumber: 1,
            title: brief.title,
            durationSec: 5,
            visualDescription: brief.keyMessage,
            textOverlay: brief.title,
            voiceover: brief.objective,
            compiledPrompt: '',
            flowJobStatus: 'IDLE',
          },
        ],
        updatedAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        studioBoards: [newBoard, ...prev.studioBoards],
        briefs: prev.briefs.map((b) => (b.id === brief.id ? { ...b, status: 'IN_STUDIO' } : b)),
      }));
    }
    setActiveRoute('studio');
  };

  const handleCreateGuidelineDraftFromExtraction = (
    brandId: string,
    clientId: string,
    evidences: BrandEvidence[],
    swatches: BrandSwatch[],
    fonts: BrandFontRule[],
    sourceFileName: string
  ) => {
    setState((prev) => {
      const existing = prev.guidelines[brandId];
      const versions = existing?.versions ?? [];
      const nextNum = versions.length > 0 ? Math.max(...versions.map((v) => v.versionNumber)) + 1 : 1;

      const findCat = (code: BrandEvidence['categoryCode'], fallback: string) =>
        evidences.find((e) => e.categoryCode === code)?.extractedValue || fallback;

      const draftVersion: BrandGuidelineVersion = {
        id: `gl-${clientId}-v${nextNum}-${Date.now().toString(36)}`,
        brandId,
        clientId,
        versionNumber: nextNum,
        status: 'DRAFT',
        sections: {
          brandIdentity: findCat('A_IDENTITY', 'NOT VERIFIED'),
          logoSystem: findCat('G_LOGO', 'NOT VERIFIED'),
          colorSystem: findCat('H_COLORS', 'NOT VERIFIED'),
          typography: findCat('I_TYPOGRAPHY', 'NOT VERIFIED'),
          photography: findCat('J_PHOTO_ILLUSTRATION', 'NOT VERIFIED'),
          illustration: findCat('K_GRAPHIC_LAYOUT', 'NOT VERIFIED'),
          composition: findCat('K_GRAPHIC_LAYOUT', 'NOT VERIFIED'),
          toneOfVoice: findCat('L_TONE', 'NOT VERIFIED'),
          messaging: findCat('M_TAGLINE_MESSAGING', 'NOT VERIFIED'),
          dosList: [findCat('N_DOS_DONTS', 'Ikuti aturan terverifikasi di dokumen sumber.')],
          dontsList: ['Jangan mengarang nilai HEX atau font yang tidak tercantum di dokumen sumber.'],
        },
        swatches,
        fonts,
        logoGallery: [],
        referenceGallery: [],
        evidences,
        changeSummary: `Diekstrak dari ${sourceFileName} (${evidences.length} aturan)`,
        createdBy: activeUser.name,
        createdAt: new Date().toISOString(),
      };

      return {
        ...prev,
        guidelines: {
          ...prev.guidelines,
          [brandId]: {
            brandId,
            clientId,
            activeVersionId: existing?.activeVersionId ?? null,
            versions: [...versions, draftVersion],
          },
        },
      };
    });
    setActiveRoute('brand-guidelines');
  };

  const handleCreativeToBrief = (direction: CreativeDirection, concept: CreativeConcept) => {
    const ch = state.channels.find((c) => c.clientId === direction.clientId) ?? state.channels[0];
    const newBrief: BriefItem = {
      id: `brf-${Date.now().toString(36)}`,
      clientId: direction.clientId,
      brandId: direction.brandId,
      channelId: ch.id,
      title: `${concept.campaignName}: ${concept.conceptTitle}`,
      objective: direction.campaignObjective,
      targetAudience: direction.targetAudience,
      keyMessage: concept.bigIdea,
      deliverableFormat: direction.format,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'NEW',
      sourceCreativeId: direction.id,
    };
    setState((prev) => ({
      ...prev,
      briefs: [newBrief, ...prev.briefs],
      creativeDirections: prev.creativeDirections.map((d) =>
        d.id === direction.id ? { ...d, status: 'SENT_TO_BRIEF' } : d
      ),
    }));
    setActiveRoute('brief');
  };

  const handleCreativeToStudio = (direction: CreativeDirection, concept: CreativeConcept) => {
    const ch = state.channels.find((c) => c.clientId === direction.clientId) ?? state.channels[0];
    const approved = getApprovedGuidelineVersion(state.guidelines[direction.brandId]);
    const newBoard: StudioBoard = {
      id: `stb-${Date.now().toString(36)}`,
      clientId: direction.clientId,
      brandId: direction.brandId,
      channelId: ch.id,
      title: `Creative: ${concept.conceptTitle}`,
      locks: {
        characterLock: true,
        characterRef: ch.characterLockPreset,
        setLock: true,
        setRef: concept.artDirection,
        styleLock: true,
        styleRef: concept.visualDirection,
        productLock: false,
        productRef: '',
        brandLock: Boolean(approved),
        logoLock: Boolean(approved),
        typographyLock: Boolean(approved),
        visualIdentityLock: Boolean(approved),
      },
      scenes: [
        {
          id: `scn-${Date.now().toString(36)}`,
          sceneNumber: 1,
          title: concept.conceptTitle,
          durationSec: 6,
          visualDescription: concept.aiImagePrompts[0] || concept.visualDirection,
          textOverlay: concept.headlines[0] || concept.bigIdea,
          voiceover: concept.designerProductionBrief,
          compiledPrompt: '',
          flowJobStatus: 'IDLE',
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      studioBoards: [newBoard, ...prev.studioBoards],
      creativeDirections: prev.creativeDirections.map((d) =>
        d.id === direction.id ? { ...d, status: 'SENT_TO_STUDIO' } : d
      ),
    }));
    setActiveRoute('studio');
  };

  const handleAddPreluxesSchedule = (result: ScheduleResult) => {
    setState((prev) => {
      const existingIds = new Set(prev.socialContents.map((s) => s.id));
      const fresh = result.items.filter((i) => !existingIds.has(i.id));
      if (fresh.length === 0) return prev;
      const hasCampaign = prev.campaigns.some((c) => c.id === result.campaignId);
      const platforms = Array.from(new Set(fresh.map((i) => i.platform)));
      return {
        ...prev,
        campaigns: hasCampaign
          ? prev.campaigns
          : [
              {
                id: result.campaignId,
                brandId: PRELUXES_WORKSPACE_ID,
                clientId: PRELUXES_CLIENT_ID,
                guidelineVersionId: fresh[0].guidelineVersionId,
                name: result.campaignName,
                horizonDays: 14,
                platforms,
                contentPillars: result.contentPillars,
                strategySummary: result.strategySummary,
                createdAt: new Date().toISOString(),
              },
              ...prev.campaigns,
            ],
        socialContents: [...fresh, ...prev.socialContents],
        activityLogs: [
          {
            id: `log-${Date.now().toString(36)}`,
            clientId: PRELUXES_CLIENT_ID,
            brandId: PRELUXES_WORKSPACE_ID,
            actor: activeUser.name,
            role: activeUser.role,
            action: 'SCHEDULED_FROM_CATALOG',
            target: `${fresh.length} konten DRAFT (${platforms.join(', ')})`,
            timestamp: new Date().toISOString(),
          },
          ...prev.activityLogs,
        ],
      };
    });
  };

  const handleSocialToBrief = (item: SocialContent) => {
    const ch = state.channels.find((c) => c.clientId === item.clientId) ?? state.channels[0];
    const newBrief: BriefItem = {
      id: `brf-${Date.now().toString(36)}`,
      clientId: item.clientId,
      brandId: item.brandId,
      channelId: ch.id,
      title: `[${item.platform}] ${item.headline}`,
      objective: item.campaignName,
      targetAudience: 'Audiens Sosial Media',
      keyMessage: item.hook,
      deliverableFormat: `${item.platform} ${item.format}`,
      dueDate: item.scheduledDate,
      status: 'NEW',
      sourceSocialId: item.id,
    };
    setState((prev) => ({ ...prev, briefs: [newBrief, ...prev.briefs] }));
    setActiveRoute('brief');
  };

  const handleSocialToStudio = (item: SocialContent) => {
    const ch = state.channels.find((c) => c.clientId === item.clientId) ?? state.channels[0];
    const approved = getApprovedGuidelineVersion(state.guidelines[item.brandId]);
    const newBoard: StudioBoard = {
      id: `stb-${Date.now().toString(36)}`,
      clientId: item.clientId,
      brandId: item.brandId,
      channelId: ch.id,
      title: `${item.platform}: ${item.headline}`,
      locks: {
        characterLock: true,
        characterRef: ch.characterLockPreset,
        setLock: false,
        setRef: '',
        styleLock: true,
        styleRef: ch.visualStyle,
        productLock: false,
        productRef: '',
        brandLock: Boolean(approved),
        logoLock: Boolean(approved),
        typographyLock: Boolean(approved),
        visualIdentityLock: Boolean(approved),
      },
      scenes: [
        {
          id: `scn-${Date.now().toString(36)}`,
          sceneNumber: 1,
          title: item.headline,
          durationSec: 5,
          visualDescription: item.visualPrompt,
          textOverlay: item.headline,
          voiceover: item.videoScript || item.caption,
          compiledPrompt: '',
          flowJobStatus: 'IDLE',
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, studioBoards: [newBoard, ...prev.studioBoards] }));
    setActiveRoute('studio');
  };

  return (
    <LayoutShell
      activeRoute={activeRoute}
      onSelectRoute={setActiveRoute}
      language={state.language}
      onChangeLanguage={(lang: Language) => setState((prev) => ({ ...prev, language: lang }))}
      activeUser={activeUser}
      users={state.users}
      onSwitchUser={handleSwitchUser}
      activeClientId={state.activeClientId}
      clients={state.clients}
      onSwitchClient={(clientId) => setState((prev) => ({ ...prev, activeClientId: clientId }))}
      driveConnected={driveConnected}
      driveUserEmail={driveUserEmail}
      onGoogleSignIn={handleGoogleSignIn}
      onGoogleSignOut={handleGoogleSignOut}
    >
      {driveNotice && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900">
          {driveNotice}
        </div>
      )}

      {activeRoute === 'workshop' && (
        <WorkshopView
          state={state}
          activeUser={activeUser}
          driveConnected={driveConnected}
          onNavigate={setActiveRoute}
          onGoogleSignIn={handleGoogleSignIn}
        />
      )}

      {activeRoute === 'dompet' && (
        <DompetView
          state={state}
          activeUser={activeUser}
          onAddTransaction={handleAddTransaction}
          onMarkPaid={handleMarkTransactionPaid}
        />
      )}

      {activeRoute === 'brief' && (
        <BriefView
          state={state}
          activeUser={activeUser}
          onAddBrief={handleAddBrief}
          onSendBriefToStudio={handleSendBriefToStudio}
        />
      )}

      {activeRoute === 'studio' && (
        <StudioView
          state={state}
          activeUser={activeUser}
          onUpdateBoard={(board) =>
            setState((prev) => ({
              ...prev,
              studioBoards: prev.studioBoards.map((b) => (b.id === board.id ? board : b)),
            }))
          }
          onCreateBoard={(board) =>
            setState((prev) => ({ ...prev, studioBoards: [board, ...prev.studioBoards] }))
          }
        />
      )}

      {activeRoute === 'video' && (
        <VideoReviewView
          state={state}
          activeUser={activeUser}
          onUpdateVideo={(vid: VideoDeliverable) =>
            setState((prev) => ({
              ...prev,
              videos: prev.videos.map((v) => (v.id === vid.id ? vid : v)),
            }))
          }
          onAddVideo={(vid: VideoDeliverable) =>
            setState((prev) => ({ ...prev, videos: [vid, ...prev.videos] }))
          }
        />
      )}

      {(activeRoute === 'bantuan' || activeRoute === 'admin') && (
        <AdminHelpView
          mode={activeRoute}
          state={state}
          activeUser={activeUser}
          onUpdateConfig={(cfg: SystemConfig) =>
            setState((prev) => ({ ...prev, systemConfig: cfg }))
          }
          onUpdateUserRole={(userId: string, role: Role, assignedClientIds: string[]) =>
            setState((prev) => ({
              ...prev,
              users: prev.users.map((u) =>
                u.id === userId ? { ...u, role, assignedClientIds } : u
              ),
            }))
          }
          onRestoreBackup={(restored) => setState(restored)}
        />
      )}

      {activeRoute === 'brand-workspace' && (
        <BrandWorkspaceView
          state={state}
          activeUser={activeUser}
          onSelectClient={(clientId) => setState((prev) => ({ ...prev, activeClientId: clientId }))}
          onUpdateWorkspace={(ws: BrandWorkspace) =>
            setState((prev) => ({
              ...prev,
              workspaces: prev.workspaces.map((w) => (w.id === ws.id ? ws : w)),
            }))
          }
          onCreateClientWorkspace={(client: ClientRecord, workspace: BrandWorkspace) =>
            setState((prev) => ({
              ...prev,
              clients: [...prev.clients, client],
              workspaces: [...prev.workspaces, workspace],
              activityLogs: [
                {
                  id: `log-${Date.now().toString(36)}`,
                  clientId: client.id,
                  brandId: workspace.id,
                  actor: activeUser.name,
                  role: activeUser.role,
                  action: 'CREATED_WORKSPACE',
                  target: `${workspace.brandName} (${client.name})`,
                  timestamp: new Date().toISOString(),
                },
                ...prev.activityLogs,
              ],
            }))
          }
          onNavigate={setActiveRoute}
        />
      )}

      {activeRoute === 'brand-intelligence' && (
        <BrandIntelligenceView
          state={state}
          activeUser={activeUser}
          driveConnected={driveConnected}
          onAddAsset={(asset: BrandAsset) =>
            setState((prev) => ({ ...prev, assets: [asset, ...prev.assets] }))
          }
          onCreateGuidelineDraftFromExtraction={handleCreateGuidelineDraftFromExtraction}
          onGoogleSignIn={handleGoogleSignIn}
        />
      )}

      {activeRoute === 'brand-guidelines' && (
        <BrandGuidelinesView
          state={state}
          activeUser={activeUser}
          onUpdateGuideline={(brandId: string, guideline: BrandGuideline) =>
            setState((prev) => ({
              ...prev,
              guidelines: { ...prev.guidelines, [brandId]: guideline },
            }))
          }
        />
      )}

      {activeRoute === 'creative-direction' && (
        <CreativeDirectionView
          state={state}
          activeUser={activeUser}
          onAddCreativeDirection={(dir: CreativeDirection) =>
            setState((prev) => ({
              ...prev,
              creativeDirections: [dir, ...prev.creativeDirections],
            }))
          }
          onSelectConcept={(dirId: string, idx: number) =>
            setState((prev) => ({
              ...prev,
              creativeDirections: prev.creativeDirections.map((d) =>
                d.id === dirId ? { ...d, selectedConceptIndex: idx } : d
              ),
            }))
          }
          onSendToBrief={handleCreativeToBrief}
          onSendToStudio={handleCreativeToStudio}
        />
      )}

      {activeRoute === 'social-studio' && (
        <SocialMediaStudioView
          state={state}
          activeUser={activeUser}
          onAddSocialContents={(
            name: string,
            horizonDays: 7 | 14 | 30,
            platforms: SocialPlatform[],
            contentPillars: string[],
            strategySummary: string,
            items: SocialContent[]
          ) =>
            setState((prev) => ({
              ...prev,
              campaigns: [
                {
                  id: items[0]?.campaignId || `cmp-${Date.now().toString(36)}`,
                  brandId: items[0]?.brandId || `ws-${prev.activeClientId}`,
                  clientId: prev.activeClientId,
                  guidelineVersionId: items[0]?.guidelineVersionId ?? null,
                  name,
                  horizonDays,
                  platforms,
                  contentPillars,
                  strategySummary,
                  createdAt: new Date().toISOString(),
                },
                ...prev.campaigns,
              ],
              socialContents: [...items, ...prev.socialContents],
            }))
          }
          onUpdateSocialStatus={(id: string, status: SocialContentStatus) =>
            setState((prev) => ({
              ...prev,
              socialContents: prev.socialContents.map((s) =>
                s.id === id ? { ...s, status } : s
              ),
            }))
          }
          onUpdateSocialCaption={(id: string, caption: string, hook?: string) =>
            setState((prev) => ({
              ...prev,
              socialContents: prev.socialContents.map((s) =>
                s.id === id ? { ...s, caption, ...(hook ? { hook } : {}) } : s
              ),
            }))
          }
          onConvertToBrief={handleSocialToBrief}
          onCreateStudioBoard={handleSocialToStudio}
        />
      )}

      {activeRoute === 'visual-checker' && (
        <VisualCheckerView
          state={state}
          activeUser={activeUser}
          onAddVisualAudit={(audit: VisualAudit) =>
            setState((prev) => ({ ...prev, visualAudits: [audit, ...prev.visualAudits] }))
          }
        />
      )}

      {activeRoute === 'brand-reports' && (
        <BrandReportsView state={state} activeUser={activeUser} />
      )}

      {activeRoute === 'website' && (
        <WebsiteHubView
          state={state}
          activeUser={activeUser}
          onSwitchClient={(clientId) => setState((prev) => ({ ...prev, activeClientId: clientId }))}
          onNavigate={setActiveRoute}
          onAddSchedule={handleAddPreluxesSchedule}
        />
      )}
    </LayoutShell>
  );
}
