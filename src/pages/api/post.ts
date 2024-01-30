import type { NextApiRequest, NextApiResponse } from "next";

import {
  BASE_URL,
  generateFarcasterFrame,
  validateMessage,
  validateXmtpMessage,
} from "@/utils";
import { FramePostPayload } from "@xmtp/frames-validator/dist/src/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const signedMessage = req.body as
    | {
        untrustedData: {
          fid: number;
          url: string;
          messageHash: string;
          timestamp: number;
          network: number;
          buttonIndex: number;
          castId: { fid: number; hash: string };
        };
        trustedData?: {
          messageBytes: string;
        };
      }
    | FramePostPayload;

  // `trustedData` doesn't get returned by the Warpcast embed debugger, but we should validate it if it's there
  // This if statement should probs be removed in prod
  if (signedMessage.trustedData) {
    if ("conversationIdentifier" in signedMessage.untrustedData) {
      try {
        await validateXmtpMessage(signedMessage as FramePostPayload);
      } catch (e) {
        console.error(e);
        return res.status(400).json({ error: "Invalid message" });
      }
    } else {
      const isMessageValid = await validateMessage(
        signedMessage.trustedData.messageBytes
      );

      if (!isMessageValid) {
        return res.status(400).json({ error: "Invalid message" });
      }
    }
  }

  const choice = signedMessage.untrustedData.buttonIndex;

  let html: string = "";

  if (choice === 1) {
    html = generateFarcasterFrame(`${BASE_URL}/happy.jpg`, choice);
  } else {
    html = generateFarcasterFrame(`${BASE_URL}/threat.jpg`, choice);
  }

  return res.status(200).setHeader("Content-Type", "text/html").send(html);
}
