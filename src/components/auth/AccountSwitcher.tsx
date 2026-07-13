// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import { ChevronDown, Gamepad2, LogOut, UserIcon, UserPlus, Wallet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { WalletModal } from '@/components/WalletModal';
import { useNIP05NamesByPubkey } from '@/hooks/useNIP05';
import { useLoggedInAccounts, type Account } from '@/hooks/useLoggedInAccounts';
import { genUserName } from '@/lib/genUserName';

interface AccountSwitcherProps {
  onAddAccountClick: () => void;
}

export function AccountSwitcher({ onAddAccountClick }: AccountSwitcherProps) {
  const { currentUser, otherUsers, setLogin, removeLogin } = useLoggedInAccounts();
  const { data: gamestrNames } = useNIP05NamesByPubkey(currentUser?.pubkey);
  const gamestrName = gamestrNames?.names?.[0]?.name;

  if (!currentUser) return null;

  const getDisplayName = (account: Account): string => {
    return account.metadata.name ?? genUserName(account.pubkey);
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className='flex items-center gap-3 p-3 rounded-full hover:bg-accent transition-all w-full text-foreground'>
          <div className="relative">
            <Avatar className='w-10 h-10'>
              <AvatarImage src={currentUser.metadata.picture} alt={getDisplayName(currentUser)} />
              <AvatarFallback>{getDisplayName(currentUser).charAt(0)}</AvatarFallback>
            </Avatar>
            {gamestrName && (
              <div className="absolute -top-0.5 -right-0.5 bg-yellow-500 text-yellow-950 rounded-full p-0.5 shadow-md">
                <Gamepad2 className="h-2.5 w-2.5" />
              </div>
            )}
          </div>
          <div className='flex-1 text-left hidden md:block truncate'>
            <p className='font-medium text-sm truncate'>{getDisplayName(currentUser)}</p>
          </div>
          <ChevronDown className='w-4 h-4 text-muted-foreground' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56 p-2 animate-scale-in'>
        <div className='font-medium text-sm px-2 py-1.5'>Switch Account</div>
        {otherUsers.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => setLogin(user.id)}
            className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
          >
            <Avatar className='w-8 h-8'>
              <AvatarImage src={user.metadata.picture} alt={getDisplayName(user)} />
              <AvatarFallback>{getDisplayName(user)?.charAt(0) || <UserIcon />}</AvatarFallback>
            </Avatar>
            <div className='flex-1 truncate'>
              <p className='text-sm font-medium'>{getDisplayName(user)}</p>
            </div>
            {user.id === currentUser.id && <div className='w-2 h-2 rounded-full bg-primary'></div>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <WalletModal>
          <DropdownMenuItem
            className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
            onSelect={(e) => e.preventDefault()}
          >
            <Wallet className='w-4 h-4' />
            <span>Wallet Settings</span>
          </DropdownMenuItem>
        </WalletModal>
        <DropdownMenuItem
          onClick={onAddAccountClick}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
        >
          <UserPlus className='w-4 h-4' />
          <span>Add another account</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => removeLogin(currentUser.id)}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md text-red-500'
        >
          <LogOut className='w-4 h-4' />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
