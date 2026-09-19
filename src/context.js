import React, { createContext, useState, useCallback, useMemo } from 'react';
import { disconnectWallet as clearActiveWeb3Provider } from './helpers/wallet';

const walletAddress = '';
const voteCountChanged = 0;
const synchroTables = 0;
const adminFlag = false;
const allowWalletRestore = true;

export const AppContext = createContext({
  walletAddress,
  voteCountChanged,
  synchroTables,
  adminFlag,
  allowWalletRestore,
  handleWalletAddress() {},
  handleDisconnectWallet() {},
  handleVoteCountChanged() {},
  handleSynchroTables() {},
  handleAdminFlag() {},
});

export function WalletProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState('');
  const [voteCountChanged, setVoteCountChanged] = useState(0);
  const [synchroTables, setSynchroTables] = useState(0);
  const [adminFlag, setAdminFlag] = useState(false);
  const [allowWalletRestore, setAllowWalletRestore] = useState(true);

  const handleWalletAddress = useCallback((address) => {
    setWalletAddress(address);
    if (address) setAllowWalletRestore(true);
  }, []);

  const handleDisconnectWallet = useCallback(async () => {
    await clearActiveWeb3Provider();
    setWalletAddress('');
    setAllowWalletRestore(false);
  }, []);

  const handleVoteCountChanged = useCallback((count) => setVoteCountChanged(count), []);
  const handleSynchroTables = useCallback((value) => setSynchroTables(value), []);
  const handleAdminFlag = useCallback((flag) => setAdminFlag(flag), []);

  const value = useMemo(
    () => ({
      walletAddress,
      voteCountChanged,
      synchroTables,
      adminFlag,
      allowWalletRestore,
      handleWalletAddress,
      handleDisconnectWallet,
      handleVoteCountChanged,
      handleSynchroTables,
      handleAdminFlag,
    }),
    [
      walletAddress,
      voteCountChanged,
      synchroTables,
      adminFlag,
      allowWalletRestore,
      handleWalletAddress,
      handleDisconnectWallet,
      handleVoteCountChanged,
      handleSynchroTables,
      handleAdminFlag,
    ]
  )

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
