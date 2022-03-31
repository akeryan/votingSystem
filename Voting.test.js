const { expect } = require("chai");
const { Contract } = require("ethers");

describe("Voting contract", function () {
	let Voting;
	let hardhatVoting;
	let owner;
	let addr1;
	let addr2;
	let addr3;
	let addr4;
	let addrs;
  
	beforeEach(async function () {
	  // Get the ContractFactory and Signers here.
	  Voting = await ethers.getContractFactory("Voting");
	  [owner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();
  
	  hardhatVoting = await Voting.deploy();
	});

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
		  expect(await hardhatVoting.owner()).to.equal(owner.address);
		});

	});

	describe("Functions", function () {
		it("addOwner", async function() {
			// check that owner can add candidates
			await hardhatVoting.addCandidate("Candidate1", addr1.address);
			expect(await hardhatVoting.isCandidate(addr1.address)).to.equal(true);

			// only owner can add a candidate
			await expect(
				hardhatVoting.connect(addr2.address).addCandidate("Candidate2", addr3.address)
			).to.be.reverted;

			// all the candidates are unique
			await expect(
				hardhatVoting.addCandidate("Candidate2", addr1.address)
			).to.be.revertedWith("This candidate is already registered");

			// candidate cannot be added after the voting launch
			await hardhatVoting.launchVoting();
			await expect(
				hardhatVoting.addCandidate("Candidate2", addr2.address)
			).to.be.revertedWith("Candidate cannot be added after the campaign is launched");
		});

		it("launchVoting", async function () {
			// campaign can be launched only when at least one candidate is registered
			await expect(
				hardhatVoting.launchVoting()
			).to.be.revertedWith("Campaign can be launched only when there is at least one registered candidate");
			
			await hardhatVoting.addCandidate("Candidate1", addr1.address);
			await hardhatVoting.launchVoting();
			//launchVoting indeed launches the voting campaign
			expect (await hardhatVoting.isVotingOpen()).to.equal("YES");

			//relaunch is not possible
			await expect(
				hardhatVoting.launchVoting()
			).to.be.revertedWith("Campaign can be launched only once");
		});

		it("setCommission: this function changes the default falue for commission (10%) to different value", async () => {
			//check that the default value is indeed == 10 %
			expect( await hardhatVoting.COMMISSION()).to.equal(10);

			//check that commission is changed
			await hardhatVoting.setCommission(15);
			expect( await hardhatVoting.COMMISSION()).to.equal(15);

			//check that commission cannot be changed after the voting is launched
			await hardhatVoting.addCandidate("candidate", addr1.address);
			await hardhatVoting.launchVoting();
			await expect(
				hardhatVoting.setCommission(12)
			).to.be.revertedWith("Commission can be set only before the voting is launched");
		});

		it("setVotingDuration: this function changes the default falue for duration (3 days) to different value", async () => {
			//check that the default value is indeed == 3 days %
			expect( await hardhatVoting.VOTING_DURATION()).to.equal(259200); // 3 days in seconds

			//check that duration is changed
			await hardhatVoting.setVotingDuration(3600); //1 hour
			expect( await hardhatVoting.VOTING_DURATION()).to.equal(3600); 

			//check that commission cannot be changed after the voting is launched
			await hardhatVoting.addCandidate("candidate", addr1.address);
			await hardhatVoting.launchVoting();
			await expect(
				hardhatVoting.setVotingDuration(600) // 10 minutes
			).to.be.revertedWith("Voting duration can be set only before the voting is launched");
		});

		it("setPriceToVote", async () => {
			//check that the default value is indeed == 0.01 eth %
			expect( await hardhatVoting.CONTRIBUTION_TO_VOTE()
				).to.equal(ethers.utils.parseEther("0.01"));

			//check that the CONTRIBUTION_TO_VOTE has changed
			await hardhatVoting.setPriceToVote(ethers.utils.parseEther("1"));
			expect ( await hardhatVoting.CONTRIBUTION_TO_VOTE()).to.equal(
				ethers.utils.parseEther("1"));	

			//check that CONTRIBUTION_TO_VOTE cannot be changed after the voting is launched
			await hardhatVoting.addCandidate("candidate", addr1.address);
			await hardhatVoting.launchVoting();
			await expect(
				hardhatVoting.setPriceToVote(ethers.utils.parseEther("1")) // 10 minutes
			).to.be.revertedWith("Voting duration can be set only before the voting is launched");						
		});
  
		it("closeVoting", async function () {
			// cannot close the voting if it hasn't been launched
			await hardhatVoting.addCandidate("Candidate1", addr1.address);
			await expect(hardhatVoting.closeVoting()).to.be.revertedWith("This command is possible only when the voting is launched");

			// check that the voting cannot be closed before the VOTING_END_DATE reached
			await hardhatVoting.setVotingDuration(5);
			await hardhatVoting.launchVoting();
			await expect(
				hardhatVoting.closeVoting()
			).to.be.revertedWith("Voting can be closed only after the VOTING_END_TIME");

			// check that voting closes after the VOTING_END_TIME is reached ?????????????????
			// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
			//await hardhatVoting.wait(5);

		});

		it("voteForCandidate", async function () {
			// voting is not possible before voting is launched
			await hardhatVoting.addCandidate("Candidate1", addr1.address);
			await hardhatVoting.addCandidate("Candidate2", addr2.address);
			await expect(hardhatVoting.vote(addr1.address)
			).to.be.revertedWith("This command is possible only when the voting is launched");

			//"You cannot vote after the VOTING_END_TIME"
			//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

			//voter can vote only once
			await hardhatVoting.launchVoting();
			await hardhatVoting.vote(addr1.address, {value: ethers.utils.parseEther("0.01")} );			
			await expect(
				hardhatVoting.vote(addr1.address, {value: ethers.utils.parseEther("0.01")})
			).to.be.revertedWith("Voter can vote only once");

			//candidates cannot participate to the voting
			await expect(
				hardhatVoting.connect(addr1).vote(addr2.address, {value: ethers.utils.parseEther("0.01")})
				).to.be.revertedWith("Candidates cannot participate to the voting");
			
			// address must be a valid address of a candidate
			await expect(
				hardhatVoting.connect(addr3).vote(addr4.address, {value: ethers.utils.parseEther("0.01")})
				).to.be.revertedWith("Address is not valid (not a candidate)");	

			// CONTRIBUTION_TO_VOTE must be of the specified value
			await expect(
				hardhatVoting.connect(addr3).vote(addr1.address, {value: ethers.utils.parseEther("0.4")})
				).to.be.revertedWith("Voter must contribute exactly of CONTRIBUTION_TO_VOTE value");
		});

		it ("vote(): After voting all the data is registered properly", async function() {
			let initialNumberOfVoters = await hardhatVoting.numberOfVoters();
			let initialCandidateID = await hardhatVoting.candidateId();
			await hardhatVoting.addCandidate("Candidate1", addr1.address);
			await hardhatVoting.launchVoting();
			await hardhatVoting.vote(addr1.address, {value: ethers.utils.parseEther("0.01")});
			
			expect(await hardhatVoting.numberOfVoters()).to.equal(initialNumberOfVoters + 1);
			expect(await hardhatVoting.candidateId()).to.equal(initialCandidateID + 1);
			let idx = (await hardhatVoting.candidatesByAddr(addr1.address)).id;
			expect (await hardhatVoting.votesQuantity(idx)).to.equal(1);
		});

		it ("getResultsForCandidate", async function () {
			//getResultsForCandidate is not possible untill the voting is closed
			await hardhatVoting.addCandidate("Candidate1", addr1.address);
			await hardhatVoting.addCandidate("Candidate2", addr2.address);
			await hardhatVoting.launchVoting();
			await hardhatVoting.vote(addr1.address, {value: ethers.utils.parseEther("0.01")});
			await expect(
				hardhatVoting.closeVoting()
				).to.be.revertedWith('Voting can be closed only after the VOTING_END_TIME');

			// function closes after the End time
			//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
		});

		it ("getVotingStartDate", async function(){
			// it is retrivable only after voting launch
			await expect(
				hardhatVoting.getVotingStartDate()
				).to.be.revertedWith("Voting start date is not known yet");

			await hardhatVoting.addCandidate("Candidate1", addr1.address);
			await hardhatVoting.launchVoting();
			await hardhatVoting.getVotingStartDate();
		});

		it ("getVotingEndDate", async function(){
			// it is retrivable only after voting launch
			await expect(
				hardhatVoting.getVotingEndDate()
				).to.be.revertedWith("Voting start date is not known yet");
			
			// // check the retrieved value
			// await hardhatVoting.addCandidate("Candidate1", addr1.address);
			// await hardhatVoting.setV
			// await hardhatVoting.launchVoting();
			// expect (await hardhatVoting.getVotingEndDate()).to.equal(ethers.utils.parseEther("0.01"));


		});
			
		
	});	
});