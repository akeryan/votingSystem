// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

contract VotingFactory {
    Voting[] public deployedCampaigns;

    function createCampaign() public {
        Voting newCampaign = new Voting();
        deployedCampaigns.push(newCampaign);
    }

    function getDeployedCampaigns() public view returns (Voting[] memory) {
        return deployedCampaigns;
    }
}

contract Voting {
    uint    public constant    FEE         = 0.01 ether;
    uint    public constant    COMMISSION  = 10; // %
    uint    public constant    DURATION    = 3 days;

    address payable public immutable owner;   

    address payable [] public candidates;
    mapping (address => bool) public isCandidate;

    mapping (address => bool) voters; // keeps track of voters who voted 
    uint public numVoters = 0; // total number of unique voters who voted     
    
    mapping (uint => uint) public numVotes; // candidateID => numVotes
    
    uint    public    startDate       = 0; // voting start date
    uint    public    endDate         = 0; // voting end date

    bool public hasLaunched = false; // has voting been launched?
    
    modifier onlyOwner {
        require(msg.sender == owner, "Only owner can execute this command");
        _;
    }

    modifier canVote {
        require (hasLaunched == true, "This command is possible only when the voting is launched");
        require (block.timestamp < endDate);
        _;
    }

    // modifier cannotVote {
    //     require (hasLaunched == true && block.timestamp > endDate );
    //     _;
    // }

    constructor () {
        owner = payable(msg.sender);
    }

    function addCandidate (address payable _wallet) external onlyOwner {
		require (hasLaunched == false, "Candidate cannot be added after the launch");
        require (isCandidate[_wallet] == false, "Candidate can be registered only one time");

        candidates.push(_wallet);
        isCandidate[_wallet] = true;
    }

    function launchVoting () public onlyOwner {
        require (hasLaunched == false, "Campaign can be launched only once");
        require(candidates.length > 0, "Campaign can be launched only when there is at least one registered candidate");
        startDate = block.timestamp;
        endDate = startDate + DURATION;
        hasLaunched = true;
    }

    function vote(uint candidId) external payable { 
		require (hasLaunched == true, "can vote only when the voting is launched");
        require(isCandidate[msg.sender] == false, "Candidates cannot participate to the voting"); 
        require(voters[msg.sender] == false, "Voter can vote only once");
        require(candidId < candidates.length, "Provided ID must be within available once");
        require(msg.value == FEE, "Voter must contribute exactly 0.01 eth");

        voters[msg.sender] = true;
        numVotes[candidId]++;
        numVoters++;
    }

    function closeVoting() public  { 
		require (hasLaunched == true, "can close only after the voting is launched");
		require (block.timestamp > endDate, "voting can be closed only after endDate");
        uint prizeSize = address(this).balance * (100 - COMMISSION) / 100;
        identifyWinner().transfer(prizeSize);
    }

    function identifyWinner () private view returns (address payable) {
        uint winnerId = 0;
        uint maxVotes = numVotes[winnerId];
        uint len = candidates.length;
        for (uint i = 1; i < len; i++) 
             if(numVotes[i] > maxVotes) {
                winnerId = i;
                maxVotes = numVotes[i];
             }
        return candidates[winnerId];
	}

    // function getNumVotes (uint id) public view returns (uint){
	// 	require (hasLaunched == true, "Voting must be launched");
    //     require (id < candidates.length, "Provided ID does not belong to any of the registred candidates");
    //     return numVotes[id];
    // }

    //commission can be retrieved after the voting is closed and the prize is sent to the winner
    function retrievCommission () public payable onlyOwner {
		require (block.timestamp > endDate);
        owner.transfer(address(this).balance);
    }

    // function getOngoingBalance () public view returns (uint) {
    //     return address(this).balance;
    // }

    function isVotingOpen () public view returns (string memory) {
        if(hasLaunched && block.timestamp < endDate)
            return "YES";
        else
            return "NO";
    }
}


