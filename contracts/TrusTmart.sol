// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TrusTmart
 * @notice Decentralized product authentication using blockchain-anchored SHA-256 hashes.
 * @dev Implements role-based access control for Admin, Manufacturer, Supplier, Retailer, and Consumer.
 *      Keeps on-chain data minimal (hashes + essential event data); bulk data stays off-chain.
 */
contract TrusTmart {
    // ────────────────────────── Roles ──────────────────────────
    enum Role { None, Admin, Manufacturer, Supplier, Retailer, Consumer }

    // ─────────────────────── Data Structures ───────────────────
    struct Unit {
        bytes32 detailHash;     // SHA-256 hash of the unit's details
        uint256 timestamp;      // Registration timestamp
        bool isRegistered;
        bool isSold;
        uint256 eventCount;     // Number of supply-chain events
        address registeredBy;   // Manufacturer's address
    }

    struct ChainEvent {
        bytes32 unitHash;       // The unit this event belongs to
        string eventType;       // e.g. "custody_transfer", "location_update", "status_change", "sold"
        bytes32 newHash;        // Recalculated hash after the event
        address actor;          // Who performed the action
        uint256 timestamp;
    }

    // ───────────────────────── State ──────────────────────────
    address public owner;

    mapping(address => Role) public roles;
    mapping(bytes32 => Unit) public units;            // detailHash => Unit
    mapping(bytes32 => ChainEvent[]) public events;   // unitHash => events

    // ───────────────────────── Events ─────────────────────────
    event RoleAssigned(address indexed account, Role role);
    event UnitRegistered(bytes32 indexed detailHash, address indexed manufacturer, uint256 timestamp);
    event EventRecorded(bytes32 indexed unitHash, string eventType, bytes32 newHash, address indexed actor, uint256 timestamp);
    event UnitSold(bytes32 indexed unitHash, address indexed retailer, uint256 timestamp);

    // ──────────────────────── Modifiers ───────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner");
        _;
    }

    modifier onlyRole(Role _role) {
        require(roles[msg.sender] == _role, "Unauthorized role");
        _;
    }

    modifier onlyRoles(Role _role1, Role _role2) {
        require(roles[msg.sender] == _role1 || roles[msg.sender] == _role2, "Unauthorized role");
        _;
    }

    // ────────────────────── Constructor ───────────────────────
    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.Admin;
        emit RoleAssigned(msg.sender, Role.Admin);
    }

    // ──────────────── Admin Functions ─────────────────────────

    /**
     * @notice Assign a role to an address. Admin-only.
     * @param _account  The address to assign the role to.
     * @param _role     The role to assign.
     */
    function assignRole(address _account, Role _role) external onlyRole(Role.Admin) {
        require(_account != address(0), "Invalid address");
        roles[_account] = _role;
        emit RoleAssigned(_account, _role);
    }

    // ──────────────── Manufacturer Functions ──────────────────

    /**
     * @notice Register a new product unit on-chain with its detail hash.
     * @param _detailHash  SHA-256 hash of the unit's off-chain details.
     */
    function registerUnit(bytes32 _detailHash) external onlyRole(Role.Manufacturer) {
        require(_detailHash != bytes32(0), "Hash cannot be zero");
        require(!units[_detailHash].isRegistered, "Unit already registered");

        units[_detailHash] = Unit({
            detailHash: _detailHash,
            timestamp: block.timestamp,
            isRegistered: true,
            isSold: false,
            eventCount: 0,
            registeredBy: msg.sender
        });

        emit UnitRegistered(_detailHash, msg.sender, block.timestamp);
    }

    // ──────────── Supplier / Retailer Functions ──────────────

    /**
     * @notice Record a supply-chain event (custody transfer, location update, etc.).
     * @param _unitHash   The unit's current/original detail hash.
     * @param _eventType  Description of the event type.
     * @param _newHash    Recalculated hash reflecting the updated state.
     */
    function recordEvent(
        bytes32 _unitHash,
        string calldata _eventType,
        bytes32 _newHash
    ) external onlyRoles(Role.Supplier, Role.Retailer) {
        require(units[_unitHash].isRegistered, "Unit not registered");
        require(!units[_unitHash].isSold, "Unit already sold");

        events[_unitHash].push(ChainEvent({
            unitHash: _unitHash,
            eventType: _eventType,
            newHash: _newHash,
            actor: msg.sender,
            timestamp: block.timestamp
        }));

        units[_unitHash].eventCount++;

        emit EventRecorded(_unitHash, _eventType, _newHash, msg.sender, block.timestamp);
    }

    // ─────────────── Retailer Functions ──────────────────────

    /**
     * @notice Mark a unit as sold. Retailer-only.
     * @param _unitHash  The unit's detail hash.
     */
    function markSold(bytes32 _unitHash) external onlyRole(Role.Retailer) {
        require(units[_unitHash].isRegistered, "Unit not registered");
        require(!units[_unitHash].isSold, "Unit already sold");

        units[_unitHash].isSold = true;

        emit UnitSold(_unitHash, msg.sender, block.timestamp);
    }

    // ─────────────── Public Read Functions ───────────────────

    /**
     * @notice Get unit data for consumer verification.
     * @param _detailHash  The unit's detail hash.
     */
    function getUnit(bytes32 _detailHash) external view returns (
        bytes32 detailHash,
        uint256 timestamp,
        bool isRegistered,
        bool isSold,
        uint256 eventCount,
        address registeredBy
    ) {
        Unit storage u = units[_detailHash];
        return (u.detailHash, u.timestamp, u.isRegistered, u.isSold, u.eventCount, u.registeredBy);
    }

    /**
     * @notice Get the number of events for a unit.
     */
    function getEventCount(bytes32 _unitHash) external view returns (uint256) {
        return events[_unitHash].length;
    }

    /**
     * @notice Get a specific event by index.
     */
    function getEvent(bytes32 _unitHash, uint256 _index) external view returns (
        bytes32 unitHash,
        string memory eventType,
        bytes32 newHash,
        address actor,
        uint256 timestamp
    ) {
        require(_index < events[_unitHash].length, "Event index out of bounds");
        ChainEvent storage e = events[_unitHash][_index];
        return (e.unitHash, e.eventType, e.newHash, e.actor, e.timestamp);
    }

    /**
     * @notice Check if an address has a specific role.
     */
    function hasRole(address _account, Role _role) external view returns (bool) {
        return roles[_account] == _role;
    }
}

