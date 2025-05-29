import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings, Menu as MenuIcon, X as XIcon, Home as HomeIcon, BarChart2, UploadCloud, CloudDownload, Loader2, User, SwatchBook, Images, Sheet } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { photoImportService } from '@/services/photoImportService';
import { toast } from 'sonner';

interface NavbarProps {
  rightContent?: React.ReactNode;
  centerContent?: React.ReactNode;
}

export default function Navbar({ rightContent, centerContent }: NavbarProps) {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  const { mutate: createImport, isPending: isCreatingImport } = useMutation({
    mutationFn: photoImportService.createPhotoImport,
    onSuccess: (data) => {
      toast.success('Photo import session started!');
      navigate(`/photo-imports/${data.id}`);
      toggleDrawer();
    },
    onError: (error) => {
      toast.error(`Failed to start photo import: ${error.message}`);
    },
  });

  const handleStartPhotoImport = () => {
    if (isCreatingImport) return;
    createImport();
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      const scrollDownThreshold = 20; // Hide navbar if scrolling down AND current position is past this.
      const deltaThreshold = 5; // Min scroll delta to react

      const isScrollingUp = currentScrollPos < prevScrollPos;
      const isScrollingDown = currentScrollPos > prevScrollPos;
      const scrollDelta = Math.abs(currentScrollPos - prevScrollPos);

      if (scrollDelta >= deltaThreshold) {
        if (isScrollingUp) {
          setVisible(true);
        } else if (isScrollingDown) {
          if (currentScrollPos > scrollDownThreshold) {
            setVisible(false);
          } else {
            // If scrolling down, but not past the threshold, keep it visible
            setVisible(true);
          }
        }
      }

      // Always ensure visible if at the very top
      if (currentScrollPos < deltaThreshold) {
        setVisible(true);
      }

      setPrevScrollPos(currentScrollPos <= 0 ? 0 : currentScrollPos); // Prevent negative scroll position storage
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  return (
    <>
      {/* Overlay - always in DOM, controlled by opacity and pointer-events */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ease-in-out ${
          isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleDrawer}
      ></div>

      {/* Drawer Content - always rendered, position controlled by classes */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white text-slate-800 p-4 z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Menu</h2>
          <Button variant="ghost" size="icon" onClick={toggleDrawer} className="hover:bg-accent hover:text-accent-foreground">
            <XIcon className="h-6 w-6" />
          </Button>
        </div>
        <ul>
          <li className="mb-2 ml-4">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                navigate('/');
                toggleDrawer();
              }}
            >
              <HomeIcon className="mr-2 h-5 w-5" />
              Home
            </Button>
          </li>
          <li className="mb-2 ml-4">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                navigate('/stats');
                toggleDrawer();
              }}
            >
              <BarChart2 className="mr-2 h-5 w-5" />
              Stats
            </Button>
          </li>

          {/* Settings Section Header */}
          <li className="mb-1 mt-3 px-4 py-2">
            <div className="flex items-center text-slate-500">
              <Settings className="mr-2 h-5 w-5" />
              <span className="text-sm font-medium">Settings</span>
            </div>
          </li>
          {/* Indented Settings Items */}
          <li className="mb-2 ml-4">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                navigate('/settings/account');
                toggleDrawer();
              }}
            >
              <User className="mr-2 h-5 w-5" />
              Account
            </Button>
          </li>
          <li className="mb-2 ml-4">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                navigate('/settings/skis');
                toggleDrawer();
              }}
            >
              <SwatchBook className="mr-2 h-5 w-5" />
              Manage Skis
            </Button>
          </li>

          {/* Import Days Section Header */}
          <li className="mb-1 mt-3 px-4 py-2">
            <div className="flex items-center text-slate-500">
              {isCreatingImport ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-5 w-5" />
              )}
              <span className="text-sm font-medium">Import Days</span>
            </div>
          </li>
          {/* Indented Import Items */}
          <li className="mb-2 ml-4">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
              onClick={handleStartPhotoImport}
              disabled={isCreatingImport}
              data-testid="navbar-import-days-from-photos"
            >
              <Images className="mr-2 h-5 w-5" />
              From Photos
            </Button>
          </li>
          {/* Export Days Section Header */}
          <li className="mb-1 mt-3 px-4 py-2">
            <div className="flex items-center text-slate-500">
              <CloudDownload className="mr-2 h-5 w-5" />
              <span className="text-sm font-medium">Export Days</span>
            </div>
          </li>
          {/* Indented Import Items */}
          <li className="mb-2 ml-4">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                navigate('/csv-export');
                toggleDrawer();
              }}
            >
              <Sheet className="mr-2 h-5 w-5" />
              To CSV
            </Button>
          </li>
          {/* Add other drawer items here */}
        </ul>
      </div>

      {/* Top Bar */}
      <div className={`flex justify-between items-center p-2 bg-white sticky top-0 z-30 shadow-sm transition-transform duration-300 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`} data-testid="navbar">
        {/* Left Aligned: Hamburger Menu Icon - Wrapped in a div for flex structure */}
        <div className="w-10">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600 hover:text-slate-800"
            onClick={toggleDrawer}
            aria-label="Open menu"
            data-testid="navbar-hamburger"
          >
            <MenuIcon className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex-1 text-center">
          {centerContent}
        </div>

        <div className="w-auto min-w-[40px] flex justify-end items-center gap-2">
          {rightContent}
        </div>
      </div>
    </>
  );
}
