// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

//import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract VotingCampaignFactory {
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

    struct Candidate {
        uint id;
        string name;
        address payable walletAddress;
    }

    address payable public immutable owner;

    uint public     CONTRIBUTION_TO_VOTE = 0.01 ether;
    uint public     COMMISSION = 10; // 10 percents
    uint public     VOTING_DURATION = 3 days;
    uint private    VOTING_START_DATE = 0;
    uint private    VOTING_END_DATE = 0;

    uint public candidateId = 0;
    mapping (uint => Candidate) public candidatesById;
    mapping (address => Candidate) public candidatesByAddr;
    mapping (address => bool) public isCandidate;

    uint public numberOfVoters = 0; // total number of unique voters who voted
    mapping (address => bool) voters; // keeps track of voters who voted      
    
    mapping (uint => uint) public votesQuantity; // keeps track of number of votes each of the candidates recived
    
    bool private _isVotingOpen = false; // true starting from voting launch and till someone closes the voting
    bool private _isVotingLaunched = false; // voting can be launched only once
    
    modifier onlyOwner {
        require(msg.sender == owner, "Only owner can execute this command");
        _;
    }

    modifier votingIsOpen {
        require (_isVotingLaunched == true, "This command is possible only when the voting is launched");
        require (_isVotingOpen == true, "This command is possible only when the coting is open");
        _;
    }

    modifier votingIsClosed {
        require (_isVotingLaunched == true, "This command is possible only when the voting is CLOSED");
        require (_isVotingOpen == false, "This command is possible only when the voting is CLOSED");
        _;
    }

    constructor () {
        owner = payable(msg.sender);
    }

    function addCandidate (string memory _name, address payable _wallet) external onlyOwner {
        require (_isVotingLaunched == false, "Candidate cannot be added after the campaign is launched");
        require(isCandidate[_wallet] == false, "This candidate is already registered");

        Candidate storage newCandidate = candidatesById[candidateId];
        newCandidate.id = candidateId;
        newCandidate.name = _name;
        newCandidate.walletAddress = _wallet;

        candidatesByAddr[_wallet] = newCandidate;

        isCandidate[_wallet] = true;
        candidateId++;
    }

    function launchVoting () public onlyOwner {
        require (_isVotingLaunched == false, "Campaign can be launched only once");
        require(candidateId > 0, "Campaign can be launched only when there is at least one registered candidate");
        VOTING_START_DATE = block.timestamp;
        VOTING_END_DATE = VOTING_START_DATE + VOTING_DURATION;
        _isVotingLaunched = true;
        _isVotingOpen = true;
    }

    // function vote(uint candidId) external payable votingIsOpen { 
    //     require(block.timestamp < VOTING_END_DATE, "You cannot vote after the VOTING_END_TIME");
    //     require(isCandidate[msg.sender] == false, "Candidates cannot participate to the voting"); 
    //     require(!voters[msg.sender], "Voter can vote only once");
    //     require(candidId < candidateId, "Provided ID does not belong to any of the registred candidates");
    //     require(msg.value == CONTRIBUTION_TO_VOTE, "Voter must contribute exactly 0.01 eth");

    //     voters[msg.sender] = true;
    //     votesQuantity[candidId]++;
    //     numberOfVoters++;
    // }

    function vote(address candidAddr) external payable votingIsOpen { 
        require(block.timestamp < VOTING_END_DATE, "You cannot vote after the VOTING_END_TIME");
        require(isCandidate[msg.sender] == false, "Candidates cannot participate to the voting"); 
        require(!voters[msg.sender], "Voter can vote only once");
        require(isCandidate[candidAddr] == true, "Address is not valid (not a candidate)"); 
        require(msg.value == CONTRIBUTION_TO_VOTE, "Voter must contribute exactly of CONTRIBUTION_TO_VOTE value");

        voters[msg.sender] = true;
        votesQuantity[candidatesByAddr[candidAddr].id]++;
        numberOfVoters++;
    }

    function closeVoting() public  votingIsOpen {
        require (block.timestamp > VOTING_END_DATE ,"Voting can be closed only after the VOTING_END_TIME");
        _isVotingOpen = false; 
        uint prizeSize = address(this).balance * (100 - COMMISSION) / 100;
        identifyWinner().walletAddress.transfer(prizeSize);
    }

    function identifyWinner () private view votingIsClosed returns (Candidate memory) {
        uint winnerId = 0;
        uint maxVotes = votesQuantity[0];
        uint index = 1;
        while (index < candidateId) {
            if(votesQuantity[index] > maxVotes) {
                winnerId = index;
                maxVotes = votesQuantity[index];
            }
            index++;
        }
        return candidatesById[winnerId];
    }

    function getResultsForCandidate (uint iD) public view votingIsClosed returns (uint){
        require (iD < candidateId, "Provided ID does not belong to any of the registred candidates");
        return votesQuantity[iD];
    }

    //commission can be retrieved after the voting is closed and the prize is sent to the winner
    function retrievCommission () public payable onlyOwner votingIsClosed {
        owner.transfer(address(this).balance);
    }

    function getVotingEndDate () public view returns (uint) {
        require(VOTING_END_DATE > 0, "Voting start date is not known yet");
        return VOTING_END_DATE;
    }

    function getVotingStartDate () public view returns (uint) {
        require(VOTING_START_DATE > 0, "Voting start date is not known yet");
        return VOTING_START_DATE;
    }

    function getOngoingBalance () public view returns (uint) {
        return address(this).balance;
    }

    function isVotingOpen () public view returns (string memory) {
        if(_isVotingLaunched && _isVotingOpen && block.timestamp < VOTING_END_DATE)
            return "YES";
        else
            return "NO";
    }

    function setCommission (uint _commission) external {
        require (_isVotingLaunched == false, "Commission can be set only before the voting is launched");
        COMMISSION = _commission;
    }

    function setVotingDuration (uint _duration) external {
        require (_isVotingLaunched == false, "Voting duration can be set only before the voting is launched");
        VOTING_DURATION = _duration;
    }

    function setPriceToVote(uint _price) external {
        require (_isVotingLaunched == false, "Voting duration can be set only before the voting is launched");
        CONTRIBUTION_TO_VOTE = _price;
    }
}


