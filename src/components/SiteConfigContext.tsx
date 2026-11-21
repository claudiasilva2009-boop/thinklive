import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, setInMemoryDevToken } from '../lib/api';
import { SiteConfigPublic } from '../types/thinklive';

const DEFAULT_PUBLIC_CONFIG: SiteConfigPublic = {
  brandName: 'Thinklive',
  brandTagline: '',
  defaultSeason: 'outono',
  announcement: {
    enabled: false,
    message: '',
    linkLabel: '',
    linkUrl: '',
    tone: 'warm',
  },
  homeHero: {},
  tabHeroes: {},
  hiddenCategories: [],
  pinnedPostIds: [],
  verifiedUserIds: [],
  updatedAt: '',
};

interface AdminStatusState {
  unlocked: boolean;
  hasClaimedPasscode: boolean;
  usesEnvPasscode: boolean;
  hasLinkedAccount: boolean;
}

interface SiteConfigContextValue {
  siteConfig: SiteConfigPublic;
  adminStatus: AdminStatusState;
  setSiteConfig: (cfg: SiteConfigPublic) => void;
  refreshSiteConfig: () => Promise<void>;
  refreshAdminStatus: () => Promise<void>;
  activateDevToken: (token: string | null) => void;
}

const SiteConfigContext = createContext<SiteConfigContextValue>({
  siteConfig: DEFAULT_PUBLIC_CONFIG,
  adminStatus: {
    unlocked: false,
    hasClaimedPasscode: false,
    usesEnvPasscode: false,
    hasLinkedAccount: false,
  },
  setSiteConfig: () => {},
  refreshSiteConfig: async () => {},
  refreshAdminStatus: async () => {},
  activateDevToken: () => {},
});

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [siteConfig, setSiteConfig] = useState<SiteConfigPublic>(DEFAULT_PUBLIC_CONFIG);
  const [adminStatus, setAdminStatus] = useState<AdminStatusState>({
    unlocked: false,
    hasClaimedPasscode: false,
    usesEnvPasscode: false,
    hasLinkedAccount: false,
  });

  const refreshSiteConfig = useCallback(async () => {
    try {
      const res = await api.getSiteConfig();
      if (res.siteConfig) setSiteConfig(res.siteConfig);
    } catch {
      // keep fallback config
    }
  }, []);

  const refreshAdminStatus = useCallback(async () => {
    try {
      const res = await api.getAdminStatus();
      setAdminStatus(res);
    } catch {
      // keep locked state
    }
  }, []);

  const activateDevToken = useCallback((token: string | null) => {
    setInMemoryDevToken(token);
    setAdminStatus((prev) => ({ ...prev, unlocked: Boolean(token) }));
  }, []);

  useEffect(() => {
    refreshSiteConfig();
    refreshAdminStatus();
  }, [refreshSiteConfig, refreshAdminStatus]);

  return (
    <SiteConfigContext.Provider
      value={{
        siteConfig,
        adminStatus,
        setSiteConfig,
        refreshSiteConfig,
        refreshAdminStatus,
        activateDevToken,
      }}
    >
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
