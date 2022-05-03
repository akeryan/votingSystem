const { expect } = require("chai");
const { ethers } = require("hardhat");
const { Contract, providers } = require("ethers");
const provider = waffle.provider;

describe("Voting contract", function () {
	let Factory;
	let factory;
	let deployedVoting;
	let voting;
	let owner;
	let addr1;
	let addr2;
	let addr3;
	let addr4;
	let addrs;

	const format = ethers.utils.formatEther;
	const parse = ethers.utils.parseEther;

	// Helper functions ------------------------------------------------ {

	async function addCandidates() {
		await voting.addCandidate("Alice", addr1.address);
		await voting.addCandidate("Bob", addr2.address);
	}

	async function vote() {
		await voting.vote(1 , {value: ethers.utils.parseEther("0.01")});
		await voting.connect(addr3).vote(1 , {value: ethers.utils.parseEther("0.01")});
		await voting.connect(addr4).vote(2 , {value: ethers.utils.parseEther("0.01")});
	}

	// } helper functions--------------------------------------------------
  
	beforeEach(async function () {
		[owner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

		Factory = await ethers.getContractFactory("VotingFactory", owner);
		factory = await Factory.deploy();
		await factory.deployed();

		await factory.createVoting();

		[deployedVoting] = await factory.getDeployedVotings();

		voting = await ethers.getContractAt("Voting", deployedVoting);
	});


	//=================================================================================


	describe ("Deployment", function () {
		it("Should set the right owner for Voting", async function () {
			await factory.connect(addr1).createVoting();
			let votings = await factory.getDeployedVotings();
			let voting2 = await ethers.getContractAt("Voting", votings[1]);
			expect(await voting2.owner()).to.equal(addr1.address);
		  });
	});

	//=================================================================================

	describe ("Adding candidate", function () {
		it ("Only owner can add candidates", async function() {
			await expect (voting.connect(addr2).addCandidate("Alice", addr3.address)
				).to.be.revertedWith("Ownable: caller is not the owner");
		});

		it ("Candidate can be added only once", async function () {
			await voting.addCandidate("Alice", addr1.address);
			await expect(voting.addCandidate("Bob", addr1.address)
						).to.be.revertedWith('Candidate can be added only once');
		});

		it ("Candidates can be added only before voting start", async function () {
			await voting.addCandidate("Alice", addr1.address);
			await voting.startVoting();
			await expect(voting.addCandidate("Bob", addr2.address)
						).to.be.revertedWith('Can be executed only before voting started');
		});
	});


	//=================================================================================

	describe ("Starting voting", function () {

		it ("Only owner can start voting", async function () {
			await expect (voting.connect(addr1).startVoting()
				).to.be.revertedWith("Ownable: caller is not the owner");
		});

		it("Voting cannot be started without candidates", async function () {
			await expect(voting.startVoting()
				).to.be.revertedWith("Voting can be started only when there is at least one registered candidate");
		});

		it ("Voting can be started only once", async function () {
			await voting.addCandidate("Alice", addr1.address);
			await voting.startVoting();
			await expect(voting.startVoting()
						).to.be.revertedWith("Can be executed only before voting started");
		});
	});


	//=================================================================================


	describe ("Voting", function () {

		it ("Voting is possible only after the voting started", async function () {
			await addCandidates();
			await expect(voting.vote(addr1.address)
						).to.be.revertedWith("Can be executed only after the voting started");
		});

		it ("Voter can vote only once", async function () {
			await addCandidates();
			await voting.startVoting();
			await voting.vote(1, {value: ethers.utils.parseEther("0.01")} );
			await expect(
					voting.vote(2 , {value: ethers.utils.parseEther("0.01")})
			).to.be.revertedWith("Voter can vote only once");
		});

		it ("Candidates cannot vote for themselves", async function () {
			await addCandidates ();
			await voting.startVoting();
			await expect(
					voting.connect(addr1).vote(1, {value: ethers.utils.parseEther("0.01")})
					).to.be.revertedWith("Candidates cannot vote for themselves");
		});

		it ("Candidate ID must be valid", async function () {
			await addCandidates ();
			await voting.startVoting();
			await expect(
					voting.connect(addr3).vote(0, {value: ethers.utils.parseEther("0.01")})
					).to.be.revertedWith('Candidate Id must belong to a registered candidate');
		});

		it ("Fee ethers must be correct", async function () {
			await addCandidates ();
			await voting.startVoting();
			await expect(
					voting.connect(addr3).vote(1, {value: ethers.utils.parseEther("0.008")})
					).to.be.revertedWith('Wrong amount of ethers');
		});

		it ("Voting is not possible after endTime", async function () {
			await addCandidates ();
			await voting.startVoting();
			ethers.provider.send("evm_increaseTime", [300000]);
			await expect(
				voting.vote(1 , {value: ethers.utils.parseEther("0.01")})
					).to.be.revertedWith("Can be executed before the endTime");				
		});
	});


		//=================================================================================

	describe ("Close voting", function () {
		it ("Voting cannot be closed before endTime", async function () {
			await addCandidates ();			
			await voting.startVoting();
			await expect(voting.closeVoting()
						).to.be.revertedWith("Can be executed after the endTime");
		});

		it("Voting cannot be closed twice", async function () {
			await addCandidates ();
			await voting.closeVoting();
			await expect(voting.closeVoting()
						).to.be.revertedWith("Can be executed only before the voting is closed");
		});

		it ("Winner is picked correctly", async function () {
			await addCandidates ();
			await voting.startVoting();
			await expect(voting.winnerTillNow()).to.be.revertedWith("There is no leader so far");
			await vote();			
			await ethers.provider.send("evm_increaseTime", [300000]);
			await voting.closeVoting();			
			expect (await voting.winnerTillNow()).to.equal(1);
		});						
	});


	//=================================================================================

	describe ("take commission", function () {
		it("Only owner can take the commission", async function() {
			await addCandidates();
			await voting.startVoting();
			await expect(voting.connect(addr1).takeCommission(100)
					).to.be.revertedWith("Ownable: caller is not the owner");
		});

		it ("check money flow", async function (){
			await addCandidates ();
			await voting.startVoting();
			await vote();

			expect (format(await voting.feeBox())).to.equal('0.003');
			expect (format(await voting.prizeBox())).to.equal('0.027');

			await expect(voting.takeCommission(parse('1'))
					).to.be.revertedWith("there are not enough funds");

			await voting.takeCommission(parse('0.003'));

			expect (format(await voting.feeBox())).to.equal('0.0');

			await expect(voting.takeCommission(100)
					).to.be.revertedWith("there is no balance");

			await ethers.provider.send("evm_increaseTime", [300000]);

			await voting.closeVoting();

			expect (format(await voting.prizeBox())).to.equal('0.0');
			expect (format(await ethers.provider.getBalance(voting.address))).to.equal('0.0');
		});
	});	
});
