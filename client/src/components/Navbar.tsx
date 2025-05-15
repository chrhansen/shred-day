import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings, Menu as MenuIcon, X as XIcon, Home as HomeIcon, BarChart2, UploadCloud, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { photoImportService } from '@/services/photoImportService';
import { toast } from 'sonner';

interface NavbarProps {
  rightContent?: React.ReactNode;
  title?: string;
}

export default function Navbar({ rightContent, title }: NavbarProps) {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
          <li className="mb-2">
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
          <li className="mb-2">
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
          <li className="mb-2">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                navigate('/settings');
                toggleDrawer();
              }}
            >
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </Button>
          </li>
          <li className="mb-2">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-accent hover:text-accent-foreground"
              onClick={handleStartPhotoImport}
              disabled={isCreatingImport}
            >
              {isCreatingImport ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-5 w-5" />
              )}
              Import Days from Photos
            </Button>
          </li>
          {/* Add other drawer items here */}
        </ul>
      </div>

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8 p-4 bg-white sticky top-0 z-30 shadow-sm">
        {/* Left Aligned: Hamburger Menu Icon - Wrapped in a div for flex structure */}
        <div className="w-10">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600 hover:text-slate-800"
            onClick={toggleDrawer}
            aria-label="Open menu"
          >
            <MenuIcon className="h-6 w-6" />
          </Button>
        </div>

        {/* Centered Title */}
        <div className="flex-1 text-center">
          {title && <span className="text-lg font-semibold text-slate-700">{title}</span>}
        </div>

        {/* Right Aligned: Right Content (e.g., New Day Button) - Wrapped in a div for flex structure and width consistency */}
        <div className="w-auto min-w-[40px] flex justify-end items-center gap-2">
          {rightContent}
        </div>
      </div>
    </>
  );
}
