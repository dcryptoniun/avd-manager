import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { check } from '@tauri-apps/plugin-updater';
import {
  Smartphone,
  Package,
  Wrench,
  Settings,
  Plus,
  RefreshCw,
  Play,
  Trash2,
  Edit3,
  Search,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Sun,
  Moon,
  Monitor,
  Cpu,
  HardDrive,
  Download,
  Eraser,
  Square,
  FolderOpen,
  Terminal,
} from 'lucide-react';
import type {
  NavPage,
  EnvironmentStatus,
  AvdInfo,
  SdkPackage,
  SystemImage,
  DeviceDefinition,
  EmulatorInstance,
  ToastMessage,
  LaunchOptions,
} from './lib/types';
import {
  detectEnvironment,
  setSdkPath,
  listAvds,
  createAvd,
  deleteAvd,
  renameAvd,
  wipeAvdData,
  listSdkPackages,
  listSystemImages,
  listDeviceDefinitions,
  installPackage,
  uninstallPackage,
  updateAllPackages,
  acceptLicenses,
  launchEmulator,
  listRunningEmulators,
  stopEmulator,
} from './lib/commands';

// ==========================================
// Toast Component
// ==========================================
function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}) {
  const iconMap = {
    success: <CheckCircle2 size={18} />,
    error: <XCircle size={18} />,
    warning: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{iconMap[toast.type]}</span>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => onRemove(toast.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// Modal Component
// ==========================================
function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ==========================================
// AVD Card Component
// ==========================================
function AvdCard({
  avd,
  running,
  onLaunch,
  onDelete,
  onRename,
  onWipe,
}: {
  avd: AvdInfo;
  running: boolean;
  onLaunch: () => void;
  onDelete: () => void;
  onRename: () => void;
  onWipe: () => void;
}) {
  return (
    <div className="card avd-card">
      <div className="avd-card-header">
        <div className="avd-card-info">
          <div className="avd-card-icon">
            <Smartphone size={20} />
          </div>
          <div>
            <div className="avd-card-name">{avd.name}</div>
            <div className="avd-card-device">
              {avd.device || 'Custom Device'}
            </div>
          </div>
        </div>
        <div className="avd-card-actions">
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onRename}
            title="Rename"
          >
            <Edit3 size={14} />
          </button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onWipe}
            title="Wipe Data"
          >
            <Eraser size={14} />
          </button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onDelete}
            title="Delete"
            style={{ color: 'var(--color-error)' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="avd-card-details">
        <div className="avd-detail-item">
          <span className="avd-detail-label">API Level</span>
          <span className="avd-detail-value">
            <span className="badge badge-info">
              API {avd.api_level}
            </span>
          </span>
        </div>
        <div className="avd-detail-item">
          <span className="avd-detail-label">ABI</span>
          <span className="avd-detail-value">{avd.abi || 'N/A'}</span>
        </div>
        <div className="avd-detail-item">
          <span className="avd-detail-label">Target</span>
          <span className="avd-detail-value">
            {avd.target?.substring(0, 30) || 'N/A'}
          </span>
        </div>
        <div className="avd-detail-item">
          <span className="avd-detail-label">Status</span>
          <span className="avd-detail-value">
            {running ? (
              <span className="badge badge-success">
                <span className="badge-dot" /> Running
              </span>
            ) : (
              <span className="badge badge-neutral">Stopped</span>
            )}
          </span>
        </div>
      </div>

      <div className="avd-card-footer">
        {running ? (
          <button
            className="btn btn-danger btn-sm"
            style={{ flex: 1 }}
            onClick={onLaunch}
          >
            <Square size={14} /> Stop
          </button>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            onClick={onLaunch}
          >
            <Play size={14} /> Launch
          </button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Main App
// ==========================================
function App() {
  const { theme, setTheme } = useTheme();
  const { toasts, removeToast, success, error, info } = useToast();

  // Navigation
  const [currentPage, setCurrentPage] = useState<NavPage>('devices');

  // Environment
  const [env, setEnv] = useState<EnvironmentStatus | null>(null);
  const [envLoading, setEnvLoading] = useState<boolean>(true);
  const [customSdkPath, setCustomSdkPath] = useState<string>('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);

  // AVDs
  const [avds, setAvds] = useState<AvdInfo[]>([]);
  const [avdsLoading, setAvdsLoading] = useState<boolean>(false);
  const [runningEmulators, setRunningEmulators] = useState<EmulatorInstance[]>(
    []
  );
  const [emulatorLogs, setEmulatorLogs] = useState<Record<string, string[]>>({});
  const [activeTerminalTab, setActiveTerminalTab] = useState<string>('');
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState<boolean>(false);
  const globalTerminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTerminalCollapsed && globalTerminalEndRef.current) {
      globalTerminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [emulatorLogs, isTerminalCollapsed, activeTerminalTab]);

  // SDK
  const [packages, setPackages] = useState<SdkPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState<boolean>(false);
  const [packageFilter, setPackageFilter] = useState<string>('');

  // System Images & Devices (for create dialog)
  const [systemImages, setSystemImages] = useState<SystemImage[]>([]);
  const [devices, setDevices] = useState<DeviceDefinition[]>([]);

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [showRenameDialog, setShowRenameDialog] = useState<boolean>(false);
  const [selectedAvd, setSelectedAvd] = useState<AvdInfo | null>(null);

  // Create AVD form
  const [newAvdName, setNewAvdName] = useState<string>('');
  const [newAvdImage, setNewAvdImage] = useState<string>('');
  const [newAvdDevice, setNewAvdDevice] = useState<string>('');

  // Rename form
  const [renameValue, setRenameValue] = useState<string>('');

  // Launch options
  const [launchOptions, setLaunchOptions] = useState<LaunchOptions>({
    cold_boot: false,
    wipe_data: false,
    no_snapshot: false,
    gpu: 'auto',
    no_audio: false,
    no_boot_anim: false,
  });

  // ========== Environment Detection ==========
  const loadEnvironment = useCallback(async () => {
    setEnvLoading(true);
    try {
      const status = await detectEnvironment();
      setEnv(status);
      if (status.sdk_path) {
        setCustomSdkPath(status.sdk_path);
      }
    } catch (e) {
      console.error('Failed to detect environment:', e);
    } finally {
      setEnvLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEnvironment();
  }, [loadEnvironment]);

  // ========== AVDs ==========
  const loadAvds = useCallback(async () => {
    if (!env?.sdk_path) return;
    setAvdsLoading(true);
    try {
      const list = await listAvds(env.sdk_path);
      setAvds(list);
    } catch (e) {
      error(`Failed to list AVDs: ${e}`);
    } finally {
      setAvdsLoading(false);
    }
  }, [env?.sdk_path, error]);

  const loadRunningEmulators = useCallback(async () => {
    if (!env?.sdk_path) return;
    try {
      const list = await listRunningEmulators(env.sdk_path);
      setRunningEmulators(list);
    } catch {
      // Silently fail — adb may not be available
    }
  }, [env?.sdk_path]);

  useEffect(() => {
    if (env?.is_sdk_valid) {
      loadAvds();
      loadRunningEmulators();
      const interval = setInterval(loadRunningEmulators, 5000);
      return () => clearInterval(interval);
    }
  }, [env?.is_sdk_valid, loadAvds, loadRunningEmulators]);

  // ========== SDK Packages ==========
  const loadPackages = useCallback(async () => {
    if (!env?.sdk_path) return;
    setPackagesLoading(true);
    try {
      const list = await listSdkPackages(env.sdk_path);
      setPackages(list);
    } catch (e) {
      error(`Failed to list packages: ${e}`);
    } finally {
      setPackagesLoading(false);
    }
  }, [env?.sdk_path, error]);

  useEffect(() => {
    if (env?.is_sdk_valid) {
      loadPackages();
    }
  }, [env?.is_sdk_valid, loadPackages]);

  // ========== Handlers ==========
  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const update = await check();
      if (update) {
        info(`Found update ${update.version}. Downloading...`);
        let downloaded = 0;
        let contentLength = 0;
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength || 0;
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              break;
            case 'Finished':
              break;
          }
        });
        success('Update installed! Please restart the application.');
      } else {
        success('You are on the latest version.');
      }
    } catch (e) {
      error(`Failed to check for updates: ${e}`);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleSetSdkPath = async () => {
    try {
      await setSdkPath(customSdkPath);
      success('SDK path updated');
      loadEnvironment();
    } catch (e) {
      error(`Failed to set SDK path: ${e}`);
    }
  };

  const handleCreateAvd = async () => {
    if (!env?.sdk_path || !newAvdName || !newAvdImage) return;
    try {
      await createAvd(env.sdk_path, newAvdName, newAvdImage, newAvdDevice);
      success(`AVD '${newAvdName}' created`);
      setShowCreateDialog(false);
      setNewAvdName('');
      setNewAvdImage('');
      setNewAvdDevice('');
      loadAvds();
    } catch (e) {
      error(`Failed to create AVD: ${e}`);
    }
  };

  const handleDeleteAvd = async (name: string) => {
    if (!env?.sdk_path) return;
    try {
      await deleteAvd(env.sdk_path, name);
      success(`AVD '${name}' deleted`);
      loadAvds();
    } catch (e) {
      error(`Failed to delete AVD: ${e}`);
    }
  };

  const handleRenameAvd = async () => {
    if (!env?.sdk_path || !selectedAvd || !renameValue) return;
    try {
      await renameAvd(env.sdk_path, selectedAvd.name, renameValue);
      success(`AVD renamed to '${renameValue}'`);
      setShowRenameDialog(false);
      setSelectedAvd(null);
      setRenameValue('');
      loadAvds();
    } catch (e) {
      error(`Failed to rename AVD: ${e}`);
    }
  };

  const handleWipeData = async (name: string) => {
    if (!env?.sdk_path) return;
    try {
      await wipeAvdData(env.sdk_path, name);
      success(`Data wiped for '${name}'`);
    } catch (e) {
      error(`Failed to wipe data: ${e}`);
    }
  };

  const handleLaunchEmulator = async (avdName: string) => {
    if (!env?.sdk_path) return;
    const isRunning = runningEmulators.some(
      (e) => e.name === avdName
    );
    if (isRunning) {
      const emu = runningEmulators.find((e) => e.name === avdName);
      if (emu) {
        try {
          await stopEmulator(env.sdk_path, emu.serial);
          success(`Emulator '${avdName}' stopped`);
          loadRunningEmulators();
        } catch (e) {
          error(`Failed to stop emulator: ${e}`);
        }
      }
      return;
    }
    try {
      setEmulatorLogs((prev) => ({ ...prev, [avdName]: [] })); // Clear previous logs
      setActiveTerminalTab(avdName); // Auto-focus global terminal tab
      await launchEmulator(env.sdk_path, avdName, launchOptions, (line) => {
        setEmulatorLogs((prev) => ({
          ...prev,
          [avdName]: [...(prev[avdName] || []), line].slice(-1000), // Keep last 1000 lines
        }));
      });
      success(`Emulator '${avdName}' launched`);
      setTimeout(loadRunningEmulators, 3000);
    } catch (e) {
      error(`Failed to launch emulator: ${e}`);
    }
  };

  const handleInstallPackage = async (pkg: string) => {
    if (!env?.sdk_path) return;
    info(`Installing ${pkg}...`);
    try {
      await installPackage(env.sdk_path, pkg);
      success(`Package installed: ${pkg}`);
      loadPackages();
    } catch (e) {
      error(`Failed to install: ${e}`);
    }
  };

  const handleUninstallPackage = async (pkg: string) => {
    if (!env?.sdk_path) return;
    try {
      await uninstallPackage(env.sdk_path, pkg);
      success(`Package uninstalled: ${pkg}`);
      loadPackages();
    } catch (e) {
      error(`Failed to uninstall: ${e}`);
    }
  };

  const handleUpdateAll = async () => {
    if (!env?.sdk_path) return;
    info('Updating all packages...');
    try {
      await updateAllPackages(env.sdk_path);
      success('All packages updated');
      loadPackages();
    } catch (e) {
      error(`Failed to update: ${e}`);
    }
  };

  const handleAcceptLicenses = async () => {
    if (!env?.sdk_path) return;
    try {
      await acceptLicenses(env.sdk_path);
      success('All licenses accepted');
    } catch (e) {
      error(`Failed to accept licenses: ${e}`);
    }
  };

  const openCreateDialog = async () => {
    if (!env?.sdk_path) return;
    setShowCreateDialog(true);
    try {
      const [imgs, devs] = await Promise.all([
        listSystemImages(env.sdk_path),
        listDeviceDefinitions(env.sdk_path),
      ]);
      setSystemImages(imgs);
      setDevices(devs);
    } catch {
      // Use empty lists
    }
  };

  // ========== Filtered Packages ==========
  const platformPackages = packages.filter(
    (p) =>
      (p.path.startsWith('platforms;') ||
        p.path.startsWith('system-images;') ||
        p.path.startsWith('sources;')) &&
      (packageFilter === '' ||
        p.path.toLowerCase().includes(packageFilter.toLowerCase()) ||
        p.description.toLowerCase().includes(packageFilter.toLowerCase()))
  );

  const toolPackages = packages.filter(
    (p) =>
      !p.path.startsWith('platforms;') &&
      !p.path.startsWith('system-images;') &&
      !p.path.startsWith('sources;') &&
      (packageFilter === '' ||
        p.path.toLowerCase().includes(packageFilter.toLowerCase()) ||
        p.description.toLowerCase().includes(packageFilter.toLowerCase()))
  );

  // ========== Render: Setup Wizard ==========
  if (envLoading) {
    return (
      <div className="app">
        <div className="loading-overlay" style={{ width: '100%' }}>
          <div className="spinner" />
          <div className="loading-text">Detecting environment...</div>
        </div>
      </div>
    );
  }

  if (!env?.is_sdk_valid) {
    return (
      <div className="app">
        <div className="setup-wizard">
          <div className="setup-card">
            <div className="setup-icon">
              <Smartphone size={28} />
            </div>
            <h2 className="setup-title">Welcome to AVD Manager</h2>
            <p className="setup-desc">
              Let's set up your Android SDK. We'll auto-detect your installation
              or you can specify the path manually.
            </p>

            <div className="setup-status-list">
              <div
                className={`setup-status-item ${
                  env?.sdk_path ? 'found' : 'missing'
                }`}
              >
                <span className="icon">
                  {env?.sdk_path ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <XCircle size={18} />
                  )}
                </span>
                <span>
                  Android SDK{' '}
                  {env?.sdk_path ? (
                    <small style={{ opacity: 0.7 }}>({env.sdk_path})</small>
                  ) : (
                    '— Not found'
                  )}
                </span>
              </div>
              <div
                className={`setup-status-item ${
                  env?.is_java_valid ? 'found' : 'missing'
                }`}
              >
                <span className="icon">
                  {env?.is_java_valid ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <XCircle size={18} />
                  )}
                </span>
                <span>
                  Java/JDK{' '}
                  {env?.java_version ? (
                    <small style={{ opacity: 0.7 }}>({env.java_version})</small>
                  ) : (
                    '— Not found'
                  )}
                </span>
              </div>
              <div
                className={`setup-status-item ${
                  env?.avdmanager_path ? 'found' : 'missing'
                }`}
              >
                <span className="icon">
                  {env?.avdmanager_path ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <XCircle size={18} />
                  )}
                </span>
                <span>AVD Manager CLI</span>
              </div>
              <div
                className={`setup-status-item ${
                  env?.emulator_path ? 'found' : 'missing'
                }`}
              >
                <span className="icon">
                  {env?.emulator_path ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <XCircle size={18} />
                  )}
                </span>
                <span>Android Emulator</span>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">SDK Path</label>
              <div className="setup-path-input">
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. C:\Users\you\AppData\Local\Android\Sdk"
                  value={customSdkPath}
                  onChange={(e) => setCustomSdkPath(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleSetSdkPath}>
                  <FolderOpen size={14} /> Set
                </button>
              </div>
            </div>

            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: 'var(--space-md)', justifyContent: 'center' }}
              onClick={loadEnvironment}
            >
              <RefreshCw size={14} /> Re-detect
            </button>
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  // ========== Render: Main App ==========
  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo" style={{ padding: 0, background: 'transparent' }}>
            <img src="/logo.png" alt="AVD Manager" style={{ width: 28, height: 28, borderRadius: 8 }} />
          </div>
          <div>
            <div className="sidebar-title">AVD Manager</div>
            <div className="sidebar-subtitle">v1.0.1</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Management</div>
          <button
            className={`nav-item ${currentPage === 'devices' ? 'active' : ''}`}
            onClick={() => setCurrentPage('devices')}
          >
            <Smartphone size={18} className="nav-item-icon" />
            Virtual Devices
          </button>

          <div className="sidebar-section-label">SDK</div>
          <button
            className={`nav-item ${
              currentPage === 'platforms' ? 'active' : ''
            }`}
            onClick={() => setCurrentPage('platforms')}
          >
            <Package size={18} className="nav-item-icon" />
            SDK Platforms
          </button>
          <button
            className={`nav-item ${currentPage === 'tools' ? 'active' : ''}`}
            onClick={() => setCurrentPage('tools')}
          >
            <Wrench size={18} className="nav-item-icon" />
            SDK Tools
          </button>

          <div className="sidebar-section-label">App</div>
          <button
            className={`nav-item ${
              currentPage === 'settings' ? 'active' : ''
            }`}
            onClick={() => setCurrentPage('settings')}
          >
            <Settings size={18} className="nav-item-icon" />
            Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="env-status">
            <span
              className={`env-dot ${env.is_sdk_valid ? 'connected' : 'disconnected'}`}
            />
            <span>SDK {env.is_sdk_valid ? 'Connected' : 'Not Found'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* ===== Devices Page ===== */}
        {currentPage === 'devices' && (
          <>
            <div className="content-header">
              <div className="content-header-left">
                <div>
                  <h1 className="content-title">Virtual Devices</h1>
                  <p className="content-description">
                    Manage and launch Android emulators
                  </p>
                </div>
              </div>
              <div className="content-header-actions">
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={loadAvds}
                  title="Refresh"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  className="btn btn-primary"
                  onClick={openCreateDialog}
                >
                  <Plus size={16} /> New AVD
                </button>
              </div>
            </div>
            <div className="content-body">
              {avdsLoading ? (
                <div className="loading-overlay">
                  <div className="spinner" />
                  <div className="loading-text">Loading AVDs...</div>
                </div>
              ) : avds.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Smartphone size={24} />
                  </div>
                  <h3 className="empty-state-title">No Virtual Devices</h3>
                  <p className="empty-state-desc">
                    Create your first Android Virtual Device to start testing
                    your apps.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={openCreateDialog}
                  >
                    <Plus size={16} /> Create AVD
                  </button>
                </div>
              ) : (
                <div className="card-grid">
                  {avds.map((avd) => (
                    <AvdCard
                      key={avd.name}
                      avd={avd}
                      running={runningEmulators.some(
                        (e) => e.name === avd.name
                      )}
                      onLaunch={() => handleLaunchEmulator(avd.name)}
                      onDelete={() => handleDeleteAvd(avd.name)}
                      onRename={() => {
                        setSelectedAvd(avd);
                        setRenameValue(avd.name);
                        setShowRenameDialog(true);
                      }}
                      onWipe={() => handleWipeData(avd.name)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== Platforms Page ===== */}
        {currentPage === 'platforms' && (
          <>
            <div className="content-header">
              <div className="content-header-left">
                <div>
                  <h1 className="content-title">SDK Platforms</h1>
                  <p className="content-description">
                    Install and manage Android SDK platform packages
                  </p>
                </div>
              </div>
              <div className="content-header-actions">
                <div className="search-input-wrapper">
                  <Search size={14} className="search-input-icon" />
                  <input
                    className="input search-input"
                    placeholder="Filter packages..."
                    value={packageFilter}
                    onChange={(e) => setPackageFilter(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={loadPackages}
                  title="Refresh"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleAcceptLicenses}
                >
                  <CheckCircle2 size={14} /> Accept Licenses
                </button>
              </div>
            </div>
            <div className="content-body">
              {packagesLoading ? (
                <div className="loading-overlay">
                  <div className="spinner" />
                  <div className="loading-text">Loading packages...</div>
                </div>
              ) : (
                <table className="package-table">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Version</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformPackages.map((pkg) => (
                      <tr key={pkg.path}>
                        <td>
                          <span className="package-path">{pkg.path}</span>
                          {pkg.description && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--color-text-tertiary)',
                                marginTop: '2px',
                              }}
                            >
                              {pkg.description}
                            </div>
                          )}
                        </td>
                        <td>{pkg.version}</td>
                        <td>
                          <span
                            className={`badge ${
                              pkg.status === 'installed'
                                ? 'badge-success'
                                : pkg.status === 'update'
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {pkg.status === 'installed'
                              ? 'Installed'
                              : pkg.status === 'update'
                              ? 'Update'
                              : 'Available'}
                          </span>
                        </td>
                        <td>
                          {pkg.status === 'installed' ? (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleUninstallPackage(pkg.path)}
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleInstallPackage(pkg.path)}
                            >
                              <Download size={12} /> Install
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ===== Tools Page ===== */}
        {currentPage === 'tools' && (
          <>
            <div className="content-header">
              <div className="content-header-left">
                <div>
                  <h1 className="content-title">SDK Tools</h1>
                  <p className="content-description">
                    Manage build tools, platform tools, and other SDK components
                  </p>
                </div>
              </div>
              <div className="content-header-actions">
                <div className="search-input-wrapper">
                  <Search size={14} className="search-input-icon" />
                  <input
                    className="input search-input"
                    placeholder="Filter tools..."
                    value={packageFilter}
                    onChange={(e) => setPackageFilter(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={loadPackages}
                  title="Refresh"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleUpdateAll}
                >
                  <RefreshCw size={14} /> Update All
                </button>
              </div>
            </div>
            <div className="content-body">
              {packagesLoading ? (
                <div className="loading-overlay">
                  <div className="spinner" />
                  <div className="loading-text">Loading tools...</div>
                </div>
              ) : (
                <table className="package-table">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Version</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolPackages.map((pkg) => (
                      <tr key={pkg.path}>
                        <td>
                          <span className="package-path">{pkg.path}</span>
                          {pkg.description && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--color-text-tertiary)',
                                marginTop: '2px',
                              }}
                            >
                              {pkg.description}
                            </div>
                          )}
                        </td>
                        <td>{pkg.version}</td>
                        <td>
                          <span
                            className={`badge ${
                              pkg.status === 'installed'
                                ? 'badge-success'
                                : pkg.status === 'update'
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {pkg.status === 'installed'
                              ? 'Installed'
                              : pkg.status === 'update'
                              ? 'Update'
                              : 'Available'}
                          </span>
                        </td>
                        <td>
                          {pkg.status === 'installed' ? (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleUninstallPackage(pkg.path)}
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleInstallPackage(pkg.path)}
                            >
                              <Download size={12} /> Install
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ===== Settings Page ===== */}
        {currentPage === 'settings' && (
          <>
            <div className="content-header">
              <div className="content-header-left">
                <div>
                  <h1 className="content-title">Settings</h1>
                  <p className="content-description">
                    Configure app preferences and environment
                  </p>
                </div>
              </div>
            </div>
            <div className="content-body">
              {/* Appearance */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  <Sun size={16} /> Appearance
                </h3>
                <div className="settings-card">
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-label">Theme</span>
                      <span className="settings-row-desc">
                        Choose your preferred color scheme
                      </span>
                    </div>
                    <div className="theme-switcher">
                      <button
                        className={`theme-option ${
                          theme === 'light' ? 'active' : ''
                        }`}
                        onClick={() => setTheme('light')}
                      >
                        <Sun size={12} /> Light
                      </button>
                      <button
                        className={`theme-option ${
                          theme === 'dark' ? 'active' : ''
                        }`}
                        onClick={() => setTheme('dark')}
                      >
                        <Moon size={12} /> Dark
                      </button>
                      <button
                        className={`theme-option ${
                          theme === 'system' ? 'active' : ''
                        }`}
                        onClick={() => setTheme('system')}
                      >
                        <Monitor size={12} /> System
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Environment */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  <HardDrive size={16} /> Environment
                </h3>
                <div className="settings-card">
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-label">Android SDK</span>
                      <span className="settings-row-desc">
                        SDK installation path
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                      }}
                    >
                      <span
                        className={`badge ${
                          env?.is_sdk_valid ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        <span className="badge-dot" />
                        {env?.is_sdk_valid ? 'Connected' : 'Not Found'}
                      </span>
                      <span className="settings-row-value">
                        {env?.sdk_path || 'Not set'}
                      </span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-label">Java/JDK</span>
                      <span className="settings-row-desc">
                        Java runtime version
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                      }}
                    >
                      <span
                        className={`badge ${
                          env?.is_java_valid ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        <span className="badge-dot" />
                        {env?.is_java_valid ? 'Found' : 'Not Found'}
                      </span>
                      <span className="settings-row-value">
                        {env?.java_version || 'Not detected'}
                      </span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-label">
                        AVD Manager CLI
                      </span>
                    </div>
                    <span className="settings-row-value">
                      {env?.avdmanager_path || 'Not found'}
                    </span>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-label">
                        SDK Manager CLI
                      </span>
                    </div>
                    <span className="settings-row-value">
                      {env?.sdkmanager_path || 'Not found'}
                    </span>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-label">Emulator</span>
                    </div>
                    <span className="settings-row-value">
                      {env?.emulator_path || 'Not found'}
                    </span>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-label">ADB</span>
                    </div>
                    <span className="settings-row-value">
                      {env?.adb_path || 'Not found'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SDK Path Config */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  <FolderOpen size={16} /> SDK Path Configuration
                </h3>
                <div className="settings-card">
                  <div className="settings-row">
                    <div
                      className="input-group"
                      style={{ flex: 1, marginRight: 'var(--space-md)' }}
                    >
                      <input
                        className="input"
                        type="text"
                        placeholder="Enter Android SDK path"
                        value={customSdkPath}
                        onChange={(e) => setCustomSdkPath(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleSetSdkPath}
                      >
                        Apply
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={loadEnvironment}
                      >
                        <RefreshCw size={14} /> Re-detect
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emulator Defaults */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  <Cpu size={16} /> Default Launch Options
                </h3>
                <div className="settings-card">
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-label">GPU Mode</span>
                      <span className="settings-row-desc">
                        Graphics acceleration mode
                      </span>
                    </div>
                    <select
                      className="input"
                      value={launchOptions.gpu}
                      onChange={(e) =>
                        setLaunchOptions({
                          ...launchOptions,
                          gpu: e.target.value,
                        })
                      }
                    >
                      <option value="auto">Auto</option>
                      <option value="host">Host (GPU)</option>
                      <option value="guest">Guest</option>
                      <option value="swiftshader_indirect">
                        SwiftShader
                      </option>
                    </select>
                  </div>
                  <div className="settings-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={launchOptions.cold_boot}
                        onChange={(e) =>
                          setLaunchOptions({
                            ...launchOptions,
                            cold_boot: e.target.checked,
                          })
                        }
                      />
                      Cold Boot (skip snapshot)
                    </label>
                  </div>
                  <div className="settings-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={launchOptions.no_audio}
                        onChange={(e) =>
                          setLaunchOptions({
                            ...launchOptions,
                            no_audio: e.target.checked,
                          })
                        }
                      />
                      Disable Audio
                    </label>
                  </div>
                  <div className="settings-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={launchOptions.no_boot_anim}
                        onChange={(e) =>
                          setLaunchOptions({
                            ...launchOptions,
                            no_boot_anim: e.target.checked,
                          })
                        }
                      />
                      Skip Boot Animation
                    </label>
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  <Info size={16} /> About
                </h3>
                <div className="settings-card">
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-label">AVD Manager</span>
                      <span className="settings-row-desc">
                        Open-source Android Virtual Device Manager
                      </span>
                    </div>
                    <span className="settings-row-value">v0.1.0</span>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-label">License</span>
                    </div>
                    <span className="settings-row-value">MIT</span>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-label">Updates</span>
                      <span className="settings-row-desc">Check for the latest version</span>
                    </div>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={handleCheckUpdate}
                      disabled={isCheckingUpdate}
                    >
                      {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ===== Global Terminal ===== */}
      {Object.keys(emulatorLogs).length > 0 && (
        <div className={`global-terminal ${isTerminalCollapsed ? 'collapsed' : ''}`}>
          <div className="global-terminal-header">
            <div className="global-terminal-tabs">
              {Object.keys(emulatorLogs).map((avdName) => (
                <button
                  key={avdName}
                  className={`terminal-tab ${activeTerminalTab === avdName ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTerminalTab(avdName);
                    if (isTerminalCollapsed) setIsTerminalCollapsed(false);
                  }}
                >
                  <Terminal size={14} style={{ marginRight: '6px' }} />
                  {avdName}
                </button>
              ))}
            </div>
            <div className="global-terminal-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
                title="Toggle Terminal"
              >
                {isTerminalCollapsed ? <Play size={14} /> : <Square size={14} />}
              </button>
            </div>
          </div>
          
          {!isTerminalCollapsed && (
            <div className="global-terminal-content">
              {activeTerminalTab && emulatorLogs[activeTerminalTab]?.length === 0 ? (
                <span className="avd-terminal-placeholder">Waiting for logs...</span>
              ) : (
                activeTerminalTab && emulatorLogs[activeTerminalTab]?.map((line, i) => (
                  <div key={i} className="avd-terminal-line">{line}</div>
                ))
              )}
              <div ref={globalTerminalEndRef} />
            </div>
          )}
        </div>
      )}

      {/* ===== Create AVD Dialog ===== */}
      <Modal
        open={showCreateDialog}
        title="Create Virtual Device"
        onClose={() => setShowCreateDialog(false)}
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateAvd}
              disabled={!newAvdName || !newAvdImage}
            >
              <Plus size={14} /> Create
            </button>
          </>
        }
      >
        <div className="input-group">
          <label className="input-label">AVD Name</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Pixel_8_API_34"
            value={newAvdName}
            onChange={(e) => setNewAvdName(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label className="input-label">Device</label>
          <select
            className="input"
            value={newAvdDevice}
            onChange={(e) => setNewAvdDevice(e.target.value)}
          >
            <option value="">Default</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.oem})
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">System Image</label>
          <select
            className="input"
            value={newAvdImage}
            onChange={(e) => setNewAvdImage(e.target.value)}
          >
            <option value="">Select a system image</option>
            {systemImages
              .filter((i) => i.installed)
              .map((img) => (
                <option key={img.path} value={img.path}>
                  API {img.api_level} — {img.variant} — {img.abi}
                </option>
              ))}
          </select>
          {systemImages.filter((i) => i.installed).length === 0 && (
            <small style={{ color: 'var(--color-warning)', fontSize: '11px' }}>
              No system images installed. Go to SDK Platforms to install one.
            </small>
          )}
        </div>
      </Modal>

      {/* ===== Rename Dialog ===== */}
      <Modal
        open={showRenameDialog}
        title="Rename AVD"
        onClose={() => setShowRenameDialog(false)}
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowRenameDialog(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleRenameAvd}
              disabled={!renameValue}
            >
              <Edit3 size={14} /> Rename
            </button>
          </>
        }
      >
        <div className="input-group">
          <label className="input-label">New Name</label>
          <input
            className="input"
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
          />
        </div>
      </Modal>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
