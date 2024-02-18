import { Box, Button, Divider, Heading, HStack, Input, Link, Text, useBoolean, VStack } from "@chakra-ui/react";
import { Identity } from "@semaphore-protocol/identity";
import getNextConfig from "next/config";
import { useRouter } from "next/router";
import { useCallback, useContext, useEffect, useState } from "react";
import Feedback from "../../contract-artifacts/Feedback.json";
import UnionsRegistry from "../../contract-artifacts/Feedback.json";
import Stepper from "../components/Stepper";
import LogsContext from "../context/LogsContext";
import SemaphoreContext from "../context/SemaphoreContext";
import IconAddCircleFill from "../icons/IconAddCircleFill";
import IconRefreshLine from "../icons/IconRefreshLine";
import { ethers } from "ethers";

const { publicRuntimeConfig: env } = getNextConfig();

export default function GroupsPage() {
    const router = useRouter();
    const { setLogs } = useContext(LogsContext);
    const { _users, refreshUsers, addUser } = useContext(SemaphoreContext);
    const [_loading, setLoading] = useBoolean();
    const [_identity, setIdentity] = useState<Identity>();
    const [groupId, setGroupId] = useState(""); // State to hold the new group ID input
    const [groups, setGroups] = useState<string[]>([]); // State to hold existing groups

    useEffect(() => {
        const identityString = localStorage.getItem("identity");

        if (!identityString) {
            router.push("/");
            return;
        }

        setIdentity(new Identity(identityString));
        fetchGroups(); // Fetch existing groups on component mount
    }, []);

    useEffect(() => {
        if (_users.length > 0) {
            setLogs(`${_users.length} user${_users.length > 1 ? "s" : ""} retrieved from the group 🤙🏽`);
        }
    }, [_users]);


    const fetchGroups = async () => {
        // Assuming you have a method in your contract to get all group IDs
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(env.UNIONS_CONTRACT_ADDRESS, UnionsRegistry.abi, provider);
            const groupIds = await contract.listGroups(); // This is a hypothetical function
            setGroups(groupIds.map(id => id.toString()));
        } catch (error) {
            console.error("Error fetching groups:", error);
        }
    };

    const joinGroup = useCallback(async () => {
        if (!_identity) {
            return
        }

        setLoading.on()
        setLogs(`Joining the Feedback group...`)

        let response: any

        if (env.OPENZEPPELIN_AUTOTASK_WEBHOOK) {
            response = await fetch(env.OPENZEPPELIN_AUTOTASK_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    abi: Feedback.abi,
                    address: env.FEEDBACK_CONTRACT_ADDRESS,
                    functionName: "joinGroup",
                    functionParameters: [_identity.commitment.toString()]
                })
            })
        } else {
            response = await fetch("api/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identityCommitment: _identity.commitment.toString()
                })
            })
        }

        if (response.status === 200) {
            addUser(_identity.commitment.toString())

            setLogs(`You joined the Feedback group event 🎉 Share your feedback anonymously!`)
        } else {
            setLogs("Some error occurred, please try again!")
        }

        setLoading.off()
    }, [_identity])

    const createGroup = useCallback(async () => {
        if (!_identity || groupId === "") {
            return;
        }

        setLoading.on();
        setLogs(`Creating a new group with ID: ${groupId}...`);

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const feedbackContract = new ethers.Contract(env.UNIONS_CONTRACT_ADDRESS, UnionsRegistry.abi, signer);

            const tx = await feedbackContract.createGroup(groupId, _identity.commitment.toString());
            await tx.wait();

            setLogs(`New group with ID: ${groupId} created successfully!`);
            setGroupId(""); // Reset group ID input after successful creation
        } catch (error) {
            console.error("Error creating group:", error);
            setLogs("Failed to create group. Please try again.");
        }

        setLoading.off();
    }, [_identity, groupId]);

    const userHasJoined = useCallback((identity: Identity) => _users.includes(identity.commitment.toString()), [_users]);

    return (
        <>

<Heading as="h2" size="xl">
                Groups
            </Heading>
            {/* Existing groups list */}
            <Box pt="4">
                <Text>Join an existing group</Text>
                <VStack pt="2" spacing="2">
                    {groups.map((id) => (
                        <Button key={id} onClick={() => setGroupId(id)} isLoading={_loading}>
                            Join Group {id}
                        </Button>
                    ))}
                </VStack>
            </Box>
            {/* Group creation UI */}
            <Box pt="4">
                <Text>Create a new group</Text>
                <HStack pt="2">
                    <Input
                        placeholder="Enter new group ID"
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value)}
                    />
                    <Button onClick={createGroup} isLoading={_loading}>
                        Create Group
                    </Button>
                </HStack>
            </Box>
            {/* The rest of the UI code remains unchanged */}
        </>
    );
}
