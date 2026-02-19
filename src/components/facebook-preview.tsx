"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, MessageCircle, Share2, Globe } from "lucide-react";

interface Props {
  caption: string;
  hashtags: string[];
  linkUrl?: string | null;
  imageUrl?: string | null;
  pageName?: string;
}

export function FacebookPreview({ caption, hashtags, linkUrl, imageUrl, pageName = "Swift the Great" }: Props) {
  const hashtagStr = hashtags.length > 0
    ? "\n\n" + hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
    : "";

  return (
    <Card className="max-w-md border shadow-md">
      <CardContent className="p-0">
        <div className="p-3 flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <div>
            <p className="text-sm font-semibold">{pageName}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Just now</span>
              <span>·</span>
              <Globe className="h-3 w-3" />
            </div>
          </div>
        </div>
        <div className="px-3 pb-2">
          <p className="text-sm whitespace-pre-wrap">{caption}{hashtagStr}</p>
        </div>
        {imageUrl && (
          <img src={imageUrl} alt="Post image" className="w-full object-cover max-h-80" />
        )}
        {linkUrl && (
          <div className="mx-3 mb-2 rounded border bg-muted p-3">
            <p className="text-xs text-muted-foreground truncate">{linkUrl}</p>
          </div>
        )}
        <div className="border-t px-3 py-1 flex items-center justify-between text-muted-foreground text-xs">
          <span>0 likes</span>
          <span>0 comments · 0 shares</span>
        </div>
        <div className="border-t flex items-center justify-around py-1.5 text-muted-foreground text-sm">
          <button className="flex items-center gap-1.5 px-4 py-1 rounded hover:bg-muted transition-colors cursor-default">
            <ThumbsUp className="h-4 w-4" /> Like
          </button>
          <button className="flex items-center gap-1.5 px-4 py-1 rounded hover:bg-muted transition-colors cursor-default">
            <MessageCircle className="h-4 w-4" /> Comment
          </button>
          <button className="flex items-center gap-1.5 px-4 py-1 rounded hover:bg-muted transition-colors cursor-default">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
