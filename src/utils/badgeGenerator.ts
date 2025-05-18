// src/utils/badgeGenerator.ts
import { supabase } from "./supabase";

interface WinnerBadgeData {
  winnerName: string;
  eliminations: number;
  matchDate: string;
  totalParticipants: number;
  matchId: string;
}

/**
 * Generate a winner badge image using HTML5 Canvas
 * This creates a visually appealing certificate-style image
 */
export const generateWinnerBadge = async (
  badgeData: WinnerBadgeData
): Promise<Blob | null> => {
  try {
    // Create a canvas element for drawing
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("Could not get canvas context");
      return null;
    }

    // Set canvas dimensions for high-quality output
    canvas.width = 800;
    canvas.height = 600;

    // Create gradient background
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    gradient.addColorStop(0, "#0f172a"); // Dark blue-gray
    gradient.addColorStop(0.5, "#1e293b"); // Medium blue-gray
    gradient.addColorStop(1, "#334155"); // Lighter blue-gray

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle grid pattern (like the game arena)
    ctx.strokeStyle = "rgba(59, 130, 246, 0.1)"; // Light blue
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw decorative border
    ctx.strokeStyle = "#60a5fa"; // Blue
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Draw inner border with glow effect
    ctx.shadowColor = "#60a5fa";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Reset shadow for text
    ctx.shadowBlur = 0;

    // Draw title with gradient text effect
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Create gradient for title text
    const titleGradient = ctx.createLinearGradient(0, 100, 0, 150);
    titleGradient.addColorStop(0, "#fbbf24"); // Yellow
    titleGradient.addColorStop(1, "#f59e0b"); // Orange

    ctx.fillStyle = titleGradient;
    ctx.font = "bold 48px Arial, sans-serif";
    ctx.fillText("🏆 THE DOT GAMES 🏆", canvas.width / 2, 120);

    // Draw subtitle
    ctx.fillStyle = "#e5e7eb"; // Light gray
    ctx.font = "bold 24px Arial, sans-serif";
    ctx.fillText("ARENA CHAMPION", canvas.width / 2, 170);

    // Draw winner name with special styling
    ctx.fillStyle = "#ffffff"; // White
    ctx.font = "bold 42px Arial, sans-serif";

    // Add outline to winner name for emphasis
    ctx.strokeStyle = "#1f2937"; // Dark gray
    ctx.lineWidth = 3;
    ctx.strokeText(badgeData.winnerName, canvas.width / 2, 280);
    ctx.fillText(badgeData.winnerName, canvas.width / 2, 280);

    // Draw stats section
    const statsY = 360;
    const statsSpacing = 60;

    ctx.fillStyle = "#d1d5db"; // Medium gray
    ctx.font = "bold 20px Arial, sans-serif";

    // Eliminations
    ctx.fillText(
      `${badgeData.eliminations} ELIMINATIONS`,
      canvas.width / 2,
      statsY
    );

    // Total participants
    ctx.fillText(
      `${badgeData.totalParticipants} TOTAL PARTICIPANTS`,
      canvas.width / 2,
      statsY + statsSpacing
    );

    // Match date (formatted nicely)
    const matchDate = new Date(badgeData.matchDate);
    const formattedDate = matchDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    ctx.fillText(
      formattedDate.toUpperCase(),
      canvas.width / 2,
      statsY + statsSpacing * 2
    );

    // Add some decorative elements (dots representing the game)
    const dotColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 150;
      const x = canvas.width / 2 + Math.cos(angle) * radius;
      const y = 500 + Math.sin(angle) * 30;

      ctx.fillStyle = dotColors[i % dotColors.length];
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add website watermark
    ctx.fillStyle = "#6b7280"; // Gray
    ctx.font = "16px Arial, sans-serif";
    ctx.fillText("TheDotGames.com", canvas.width / 2, canvas.height - 40);

    // Convert canvas to blob
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/png",
        0.95
      );
    });
  } catch (error) {
    console.error("Error generating winner badge:", error);
    return null;
  }
};

/**
 * Upload a badge image to Supabase Storage and return the public URL
 */
export const uploadBadgeToStorage = async (
  blob: Blob,
  matchId: string
): Promise<string | null> => {
  try {
    const fileName = `badge-${matchId}-${Date.now()}.png`;

    const { error } = await supabase.storage
      .from("winner-badges")
      .upload(fileName, blob, {
        contentType: "image/png",
        cacheControl: "3600", // Cache for 1 hour
      });

    if (error) {
      console.error("Error uploading badge:", error);
      return null;
    }

    // Get the public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from("winner-badges")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Failed to upload badge to storage:", error);
    return null;
  }
};

/**
 * Generate and upload a winner badge, returning the public URL
 * This is the main function you'll call after each match ends
 */
export const createAndUploadWinnerBadge = async (
  winnerName: string,
  eliminations: number,
  matchDate: string,
  totalParticipants: number,
  matchId: string
): Promise<string | null> => {
  try {
    // Generate the badge image
    const badgeBlob = await generateWinnerBadge({
      winnerName,
      eliminations,
      matchDate,
      totalParticipants,
      matchId,
    });

    if (!badgeBlob) {
      console.error("Failed to generate badge blob");
      return null;
    }

    // Upload to Supabase Storage
    const badgeUrl = await uploadBadgeToStorage(badgeBlob, matchId);

    if (badgeUrl) {
      // Optionally, save the badge URL back to the matches table
      await supabase
        .from("matches")
        .update({ badge_url: badgeUrl })
        .eq("id", matchId);
    }

    return badgeUrl;
  } catch (error) {
    console.error("Failed to create and upload winner badge:", error);
    return null;
  }
};

/**
 * Share a winner badge using the Web Share API or fallback to clipboard
 */
export const shareWinnerBadge = async (
  badgeUrl: string,
  winnerName: string,
  eliminations: number
): Promise<void> => {
  const shareText = `🏆 ${winnerName} just won The Dot Games with ${eliminations} eliminations! Check out tonight's battle at TheDotGames.com`;

  try {
    // Try to use the native Web Share API first (mobile-friendly)
    if (navigator.share && navigator.canShare) {
      const shareData = {
        title: "The Dot Games Winner!",
        text: shareText,
        url: badgeUrl,
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
    }

    // Fallback: Copy to clipboard
    await navigator.clipboard.writeText(`${shareText}\n\n${badgeUrl}`);

    // Show a user-friendly message
    // You might want to show a toast notification here
    alert("Winner badge link copied to clipboard!");
  } catch (error) {
    console.error("Error sharing badge:", error);

    // Final fallback: Just copy the URL
    try {
      await navigator.clipboard.writeText(badgeUrl);
      alert("Badge URL copied to clipboard!");
    } catch (clipboardError) {
      console.error("Failed to copy to clipboard:", clipboardError);
      // Could show a modal with the URL for manual copying
    }
  }
};
