// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract VotingFactory {
    Voting[] private deployedVotings;

    function createVoting() public {
        Voting newVoting = new Voting(msg.sender);
        deployedVotings.push(newVoting);
    }

    function getDeployedVotings() public view returns (Voting[] memory) {
        return deployedVotings;
    }
}

contract Voting is Ownable {
	using Counters for Counters.Counter;
    using SafeMath for uint256;

	struct Candidate {
		uint	id;
		string	name;
		address	wallet;
	}

    uint    public constant    FEE          = 0.01 ether;   // ethers required to vote
    uint    public constant    COMMISSION   = 10;           // (%) commission that stays at the platform
    uint    public constant    DURATION     = 3 days;       // duration of voting

	Counters.Counter 	private 	_candidateIdCounter; 	// id counter and tracks number of candidates

	mapping (uint => Candidate)	public 	candidates;         // candidateId => address
    mapping (address => uint)	private	isCandidate;        // if exists returns candidateId, otherwise returns 0

    mapping (address => bool)	private	voters;             // tracks whether the voter voted 
	mapping (uint => uint)		public	votesCount;			// (candidateId => votesCount) number of votes the candidates has	

    uint    public		startTime;		            		// voting start time
    uint    public		endTime;		            		// voting end time

	bool    private		isClosed;			       			// is voting closed?

	uint	public		feeBox;								// commission money accumulated so far
	uint	public		prizeBox;							// prize money accumulated so far
	uint	public		feePortion;							// FEE portion that accounts for commission
	uint	public		prizePortion;						// FEE portion that accounts for prize  

	uint	private		winnerId;							// candidate who is winning so far 
    
    constructor (address creator) Ownable() {
		transferOwnership(payable(creator));

		feeBox = address(this).balance;

		feePortion = FEE.mul(COMMISSION).div(100);
		prizePortion = FEE.sub(feePortion);
    }

    function addCandidate (string memory _name, address _addr) external onlyOwner notStarted {
        require (isCandidate[_addr] == 0,                   "Candidate can be added only once");

        _candidateIdCounter.increment();					// candidateId starts with 1
		uint candidateId = _candidateIdCounter.current();

        candidates[candidateId] = Candidate({
			id: 		candidateId, 
			name: 		_name,
			wallet: 	_addr
		});

        isCandidate[_addr] = candidateId;
    }

    function startVoting () external onlyOwner notStarted {
        require (_candidateIdCounter.current() > 0,                         "Voting can be started only when there is at least one registered candidate");
       
        startTime = block.timestamp;
        endTime = startTime.add(DURATION);
    }

    function vote(uint candidId) external payable started beforeEndTime{ 
		require (candidId > 0 && candidId <= _candidateIdCounter.current(), "Candidate Id must belong to a registered candidate");
        require (isCandidate[msg.sender] != candidId,       				"Candidates cannot vote for themselves"); 
        require (voters[msg.sender] == false,              					"Voter can vote only once");
        require (msg.value == FEE,                         					"Wrong amount of ethers");

        voters[msg.sender] = true;

        votesCount[candidId] = votesCount[candidId].add(1);

		// check whether the leader changed
		if (votesCount[candidId] > votesCount[winnerId])
			winnerId = candidId;

		feeBox = feeBox.add(feePortion);
		prizeBox = prizeBox.add(prizePortion);
    }

    // closes voting and sends the 'prize' to the winner
    function closeVoting() public afterEndTime { 
		require (isClosed == false, "Can be executed only before the voting is closed");

		isClosed = true;

		if (winnerId > 0) {
			address	winnerAddr	= candidates[winnerId].wallet;

        	payable(winnerAddr).transfer(prizeBox);
			prizeBox = 0;
		}
    }

    function takeCommission (uint s) public payable onlyOwner {
        require (feeBox > 0, "there is no balance");
		require (s <= feeBox, "there are not enough funds");

        payable(owner()).transfer(s);

		feeBox = feeBox.sub(s);
    }

    
    
    // HELPER FUNCTIONS ----------------------------------------------------		

	function winnerTillNow () public view returns (uint) {
		require (winnerId > 0, "There is no leader so far");
				
		return winnerId;
	}

   
    // MODIFIERS ------------------------------------------------------------

	modifier notStarted		{ require(startTime == 0,				"Can be executed only before voting started"); _; }

	modifier started		{ require (startTime > 0, 				"Can be executed only after the voting started"); _; }

	modifier beforeEndTime	{ require (block.timestamp < endTime,	"Can be executed before the endTime"); _; }

	modifier afterEndTime	{ require (block.timestamp > endTime, 	"Can be executed after the endTime"); _; }
}


