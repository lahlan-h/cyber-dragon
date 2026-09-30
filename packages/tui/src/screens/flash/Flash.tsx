import React from "react";
import { Text, Box } from "ink";

import { usePi } from "@/hooks/usePi";

import BuildLog from "./BuildLog";
import FlashCheckList from "./FlashCheckList";
import FilePicker from "./FilePicker";
import FlashProgress from "./FlashProgress";

const Flash = () => {
  const { pipeline, status } = usePi();

  if (status !== "connected") return <FilePicker />;

  // prettier-ignore
  switch (pipeline.stage) {
    case "uploaded":
    case "building":
    case "built": return <BuildLog />;
    case "awaiting_flash": return <FlashCheckList />; 
    case "flashing": return <FlashProgress />;
    default: return <FilePicker />; // idle, done, failed
  }
};

export default Flash;
