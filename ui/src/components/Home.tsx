import { useCallback, useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount, useReadContract } from 'wagmi';
import { Header } from './Header';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/Home.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type DecryptedSnapshot = {
  available: string;
  staked: string;
  totalStaked: string;
  totalClaimed: string;
};

function toBigIntOrZero(value: unknown) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.floor(value));
  if (typeof value === 'string' && value) {
    try {
      return BigInt(value);
    } catch {
      return BigInt(0);
    }
  }
  return BigInt(0);
}

export function Home() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pendingAction, setPendingAction] = useState<'claim' | 'stake' | 'withdraw' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedBalances, setDecryptedBalances] = useState<DecryptedSnapshot | null>(null);

  const contractReady = CONTRACT_ADDRESS !== ZERO_ADDRESS;

  const { data: claimAmountData } = useReadContract({
    address: contractReady ? CONTRACT_ADDRESS : undefined,
    abi: CONTRACT_ABI,
    functionName: 'CLAIM_AMOUNT',
    query: { enabled: contractReady },
  });

  const {
    data: hasClaimedData,
    refetch: refetchHasClaimed,
  } = useReadContract({
    address: contractReady && address ? CONTRACT_ADDRESS : undefined,
    abi: CONTRACT_ABI,
    functionName: 'hasClaimed',
    args: address ? [address] : undefined,
    query: { enabled: contractReady && !!address },
  });

  const {
    data: encryptedBalance,
    refetch: refetchBalance,
  } = useReadContract({
    address: contractReady && address ? CONTRACT_ADDRESS : undefined,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedBalance',
    args: address ? [address] : undefined,
    query: { enabled: contractReady && !!address },
  });

  const {
    data: encryptedStaked,
    refetch: refetchStaked,
  } = useReadContract({
    address: contractReady && address ? CONTRACT_ADDRESS : undefined,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedStakedBalance',
    args: address ? [address] : undefined,
    query: { enabled: contractReady && !!address },
  });

  const { data: encryptedTotalStaked, refetch: refetchTotalStaked } = useReadContract({
    address: contractReady ? CONTRACT_ADDRESS : undefined,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedTotalStaked',
    query: { enabled: contractReady },
  });

  const { data: encryptedTotalClaimed, refetch: refetchTotalClaimed } = useReadContract({
    address: contractReady ? CONTRACT_ADDRESS : undefined,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedTotalClaimed',
    query: { enabled: contractReady },
  });

  const claimAmount = useMemo(() => Number(toBigIntOrZero(claimAmountData)), [claimAmountData]);
  const hasClaimed = Boolean(hasClaimedData);

  const resetStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const guardInteractivity = () => {
    if (!contractReady) {
      setErrorMessage('Set the MysticStake contract address before interacting.');
      return false;
    }
    if (!isConnected || !address) {
      setErrorMessage('Connect your wallet to continue.');
      return false;
    }
    if (!signerPromise) {
      setErrorMessage('Wallet signer unavailable.');
      return false;
    }
    return true;
  };

  const buildContract = async () => {
    const signer = await signerPromise;
    if (!signer) {
      throw new Error('Signer not available');
    }
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  };

  const handleClaim = async () => {
    resetStatus();
    if (!guardInteractivity()) return;
    if (hasClaimed) {
      setStatusMessage('Allocation already claimed.');
      return;
    }

    try {
      setPendingAction('claim');
      const contract = await buildContract();
      const tx = await contract.claimPoints();
      setStatusMessage('Claim submitted, waiting for confirmation...');
      await tx.wait();
      setStatusMessage('Claim confirmed on-chain.');
      await Promise.all([refetchHasClaimed(), refetchBalance(), refetchTotalClaimed()]);
    } catch (error) {
      console.error('Claim failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Claim failed');
    } finally {
      setPendingAction(null);
    }
  };

  const encryptAmount = useCallback(
    async (amount: string) => {
      if (!instance) throw new Error('Encryption instance not ready');
      if (!address) throw new Error('Wallet not connected');
      const numeric = amount.trim();
      if (!numeric) throw new Error('Enter an amount first');
      if (!/^\d+$/.test(numeric)) throw new Error('Amount must be a whole number');
      const parsed = BigInt(numeric);
      const buffer = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      buffer.add64(parsed);
      return buffer.encrypt();
    },
    [instance, address],
  );

  const handleStake = async () => {
    resetStatus();
    if (!guardInteractivity()) return;
    if (!stakeAmount) {
      setErrorMessage('Enter an amount to stake.');
      return;
    }

    try {
      setPendingAction('stake');
      const encrypted = await encryptAmount(stakeAmount);
      const contract = await buildContract();
      const tx = await contract.stakePoints(encrypted.handles[0], encrypted.inputProof);
      setStatusMessage('Stake submitted, waiting for confirmation...');
      await tx.wait();
      setStatusMessage('Stake confirmed on-chain.');
      setStakeAmount('');
      await Promise.all([refetchBalance(), refetchStaked(), refetchTotalStaked()]);
    } catch (error) {
      console.error('Stake failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Stake failed');
    } finally {
      setPendingAction(null);
    }
  };

  const handleWithdraw = async () => {
    resetStatus();
    if (!guardInteractivity()) return;
    if (!withdrawAmount) {
      setErrorMessage('Enter an amount to withdraw.');
      return;
    }

    try {
      setPendingAction('withdraw');
      const encrypted = await encryptAmount(withdrawAmount);
      const contract = await buildContract();
      const tx = await contract.withdrawStake(encrypted.handles[0], encrypted.inputProof);
      setStatusMessage('Withdrawal submitted, waiting for confirmation...');
      await tx.wait();
      setStatusMessage('Withdrawal confirmed on-chain.');
      setWithdrawAmount('');
      await Promise.all([refetchBalance(), refetchStaked(), refetchTotalStaked()]);
    } catch (error) {
      console.error('Withdraw failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Withdraw failed');
    } finally {
      setPendingAction(null);
    }
  };

  const decryptBalances = async () => {
    resetStatus();
    if (!instance) {
      setErrorMessage('Encryption service not ready.');
      return;
    }
    if (!address || !signerPromise) {
      setErrorMessage('Connect your wallet to decrypt balances.');
      return;
    }
    if (!encryptedBalance || !encryptedStaked || !encryptedTotalStaked || !encryptedTotalClaimed) {
      setErrorMessage('Encrypted balances not available yet.');
      return;
    }

    try {
      setDecrypting(true);
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not available');
      }

      const keypair = instance.generateKeypair();
      const contractAddresses = [CONTRACT_ADDRESS];
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimestamp,
        durationDays,
      );

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const handles = [
        { handle: encryptedBalance as string, contractAddress: CONTRACT_ADDRESS },
        { handle: encryptedStaked as string, contractAddress: CONTRACT_ADDRESS },
        { handle: encryptedTotalStaked as string, contractAddress: CONTRACT_ADDRESS },
        { handle: encryptedTotalClaimed as string, contractAddress: CONTRACT_ADDRESS },
      ];

      const result = await instance.userDecrypt(
        handles,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimestamp,
        durationDays,
      );

      const outputs = result.outputs.map((value: string) => BigInt(value));
      setDecryptedBalances({
        available: outputs[0]?.toString() ?? '0',
        staked: outputs[1]?.toString() ?? '0',
        totalStaked: outputs[2]?.toString() ?? '0',
        totalClaimed: outputs[3]?.toString() ?? '0',
      });
      setStatusMessage('Decryption successful.');
    } catch (error) {
      console.error('Decryption failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to decrypt encrypted balances');
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="app-shell">
      <Header />
      <main className="home-content">
        <section className="panel intro-panel">
          <h1 className="title">MysticStake</h1>
          <p className="subtitle">
            Claim encrypted STK points, stake them privately, and manage withdrawals without revealing your balances.
          </p>
          {!contractReady ? (
            <p className="warning">Set the deployed MysticStake contract address in the client configuration.</p>
          ) : null}
          {zamaError ? <p className="warning">Zama SDK error: {zamaError}</p> : null}
          {zamaLoading ? <p className="info">Initialising confidential compute support...</p> : null}
        </section>

        <section className="panel stats-panel">
          <h2 className="panel-heading">Encrypted Balances</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Available (encrypted)</span>
              <code className="stat-handle">{String(encryptedBalance || '0x')}</code>
            </div>
            <div className="stat-card">
              <span className="stat-label">Staked (encrypted)</span>
              <code className="stat-handle">{String(encryptedStaked || '0x')}</code>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Staked (encrypted)</span>
              <code className="stat-handle">{String(encryptedTotalStaked || '0x')}</code>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Claimed (encrypted)</span>
              <code className="stat-handle">{String(encryptedTotalClaimed || '0x')}</code>
            </div>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={decryptBalances}
            disabled={decrypting || !instance || !isConnected}
          >
            {decrypting ? 'Decrypting balances...' : 'Decrypt balances'}
          </button>

          {decryptedBalances ? (
            <div className="decrypted-summary">
              <h3 className="summary-heading">Decrypted Snapshot</h3>
              <div className="summary-grid">
                <div>
                  <span className="summary-label">Available:</span>
                  <span className="summary-value">{decryptedBalances.available}</span>
                </div>
                <div>
                  <span className="summary-label">Staked:</span>
                  <span className="summary-value">{decryptedBalances.staked}</span>
                </div>
                <div>
                  <span className="summary-label">Total Staked:</span>
                  <span className="summary-value">{decryptedBalances.totalStaked}</span>
                </div>
                <div>
                  <span className="summary-label">Total Claimed:</span>
                  <span className="summary-value">{decryptedBalances.totalClaimed}</span>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="panel actions-panel">
          <h2 className="panel-heading">Actions</h2>
          <div className="action-group">
            <div className="action-card">
              <h3>Claim STK</h3>
              <p className="action-description">
                Each wallet can claim <strong>{claimAmount}</strong> STK exactly once.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={handleClaim}
                disabled={pendingAction !== null || !isConnected || hasClaimed}
              >
                {pendingAction === 'claim' ? 'Claiming...' : hasClaimed ? 'Claimed' : 'Claim STK'}
              </button>
            </div>

            <div className="action-card">
              <h3>Stake STK</h3>
              <p className="action-description">
                Enter an amount to encrypt with Zama and stake securely.
              </p>
              <input
                className="input"
                value={stakeAmount}
                onChange={(event) => setStakeAmount(event.target.value)}
                placeholder="Amount"
                inputMode="numeric"
              />
              <button
                type="button"
                className="primary-button"
                onClick={handleStake}
                disabled={pendingAction !== null || !isConnected}
              >
                {pendingAction === 'stake' ? 'Staking...' : 'Stake'}
              </button>
            </div>

            <div className="action-card">
              <h3>Withdraw STK</h3>
              <p className="action-description">
                Withdraw from your encrypted staked balance.
              </p>
              <input
                className="input"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="Amount"
                inputMode="numeric"
              />
              <button
                type="button"
                className="primary-button"
                onClick={handleWithdraw}
                disabled={pendingAction !== null || !isConnected}
              >
                {pendingAction === 'withdraw' ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </section>

        {statusMessage ? <p className="status success">{statusMessage}</p> : null}
        {errorMessage ? <p className="status error">{errorMessage}</p> : null}
      </main>
    </div>
  );
}
