import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <h1 className="header-title">MysticStake Portal</h1>
            <p className="header-subtitle">Confidential staking powered by Zama FHE</p>
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
