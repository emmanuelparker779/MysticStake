// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title MysticStake
/// @notice Confidential staking contract that stores balances as encrypted values.
/// Players can claim STK points once, stake any encrypted amount within their balance,
/// and withdraw staked STK while keeping amounts confidential.
contract MysticStake is SepoliaConfig {
    uint64 public constant CLAIM_AMOUNT = 1_000;

    mapping(address => euint64) private _balances;
    mapping(address => euint64) private _stakedBalances;
    mapping(address => bool) private _hasClaimed;

    euint64 private _totalStaked;
    euint64 private _totalClaimed;

    constructor() {
        _totalStaked = FHE.asEuint64(0);
        _totalClaimed = FHE.asEuint64(0);
        FHE.allowThis(_totalStaked);
        FHE.allowThis(_totalClaimed);
        FHE.allow(_totalClaimed, msg.sender);
    }

    event PointsClaimed(address indexed account, uint64 amount);
    event PointsStaked(address indexed account);
    event PointsWithdrawn(address indexed account);

    /// @notice Claim an initial allocation of STK points.
    /// Each address can call this function once.
    function claimPoints() external {
        require(!_hasClaimed[msg.sender], "Claim already completed");
        _hasClaimed[msg.sender] = true;

        euint64 claimAmount = FHE.asEuint64(CLAIM_AMOUNT);

        _balances[msg.sender] = FHE.add(_balances[msg.sender], claimAmount);
        _totalClaimed = FHE.add(_totalClaimed, claimAmount);

        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);

        FHE.allowThis(_totalClaimed);

        emit PointsClaimed(msg.sender, CLAIM_AMOUNT);
    }

    /// @notice Stake an encrypted amount of STK.
    /// @param encryptedAmount The encrypted amount to stake.
    /// @param inputProof The proof produced by the relayer for this ciphertext.
    function stakePoints(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        euint64 currentBalance = _balances[msg.sender];
        euint64 currentStaked = _stakedBalances[msg.sender];

        _balances[msg.sender] = FHE.sub(currentBalance, amount);
        _stakedBalances[msg.sender] = FHE.add(currentStaked, amount);
        _totalStaked = FHE.add(_totalStaked, amount);

        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);

        FHE.allowThis(_stakedBalances[msg.sender]);
        FHE.allow(_stakedBalances[msg.sender], msg.sender);

        FHE.allowThis(_totalStaked);
        FHE.allow(_totalStaked, msg.sender);

        emit PointsStaked(msg.sender);
    }

    /// @notice Withdraw an encrypted amount of previously staked STK.
    /// @param encryptedAmount The encrypted amount to withdraw.
    /// @param inputProof The proof produced by the relayer for this ciphertext.
    function withdrawStake(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        euint64 currentBalance = _balances[msg.sender];
        euint64 currentStaked = _stakedBalances[msg.sender];

        _balances[msg.sender] = FHE.add(currentBalance, amount);
        _stakedBalances[msg.sender] = FHE.sub(currentStaked, amount);
        _totalStaked = FHE.sub(_totalStaked, amount);

        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);

        FHE.allowThis(_stakedBalances[msg.sender]);
        FHE.allow(_stakedBalances[msg.sender], msg.sender);

        FHE.allowThis(_totalStaked);
        FHE.allow(_totalStaked, msg.sender);

        emit PointsWithdrawn(msg.sender);
    }

    /// @notice Returns the encrypted available balance for the given account.
    /// @param account Address to query.
    function getEncryptedBalance(address account) external view returns (euint64) {
        return _balances[account];
    }

    /// @notice Returns the encrypted staked balance for the given account.
    /// @param account Address to query.
    function getEncryptedStakedBalance(address account) external view returns (euint64) {
        return _stakedBalances[account];
    }

    /// @notice Returns the encrypted total amount staked across all players.
    function getEncryptedTotalStaked() external view returns (euint64) {
        return _totalStaked;
    }

    /// @notice Returns the encrypted total amount claimed across all players.
    function getEncryptedTotalClaimed() external view returns (euint64) {
        return _totalClaimed;
    }

    /// @notice Check whether an account has claimed the initial STK allocation.
    /// @param account Address to query.
    function hasClaimed(address account) external view returns (bool) {
        return _hasClaimed[account];
    }
}
