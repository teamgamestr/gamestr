import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import { Gamepad2, Code2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun } from 'lucide-react';

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
            <Gamepad2 className="h-6 w-6" />
            <span>Gamestr</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Button variant="ghost" asChild>
              <Link to="/">Games</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/developers">
                <Code2 className="mr-2 h-4 w-4" />
                Developers
              </Link>
            </Button>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Login */}
            <LoginArea className="max-w-60" />
          </div>
        </div>
      </div>
    </header>
  );
}
