import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatbotConversationContext, Venue } from "../types/api";

const { getChatbotReply } = vi.hoisted(() => ({
  getChatbotReply: vi.fn(),
}));

vi.mock("../services/api", () => ({
  api: { getChatbotReply },
}));

import {
  buildChatHistory,
  ChatBot,
  getChatbotErrorMessage,
} from "../app/components/ChatBot";

const emptyContext: ChatbotConversationContext = {
  active_search_parameters: null,
  last_recommended_venue_ids: [],
  clarification_asked: false,
  last_intent: "general_chat",
};

const venue = {
  venue_id: "venue-101",
  name: "Example Workspace",
  borough: "Manhattan",
  cuisine_type: "cafe",
  distance_km: 0.4,
  has_wifi: true,
  wifi_free: true,
  opening_now: true,
  seats_avail: 4,
  total_seats: 10,
  hourly_price: 5,
  rating: 4.8,
  lat: 40.75,
  lon: -73.98,
  accessibility_friendly: true,
  calls_allowed: true,
  wbe_certified: false,
  mbe_certified: false,
  vbe_certified: false,
  bcorp_certified: false,
  lgbt_friendly: true,
  busyness_score: 42,
  busyness_label: "Medium",
  suitability_score: 86,
} as Venue;

describe("ChatBot helpers", () => {
  it("keeps only the newest 12 bounded history messages", () => {
    const history = buildChatHistory(
      Array.from({ length: 15 }, (_, index) => ({
        id: `message-${index}`,
        text: `${index}-${"x".repeat(1200)}`,
        sender: index % 2 ? ("ai" as const) : ("user" as const),
        timestamp: new Date(),
      })),
    );

    expect(history).toHaveLength(12);
    expect(history[0].message.startsWith("3-")).toBe(true);
    expect(history.every((item) => item.message.length <= 1000)).toBe(true);
  });

  it("differentiates validation, rate-limit, service, and network errors", () => {
    expect(
      getChatbotErrorMessage({
        isAxiosError: true,
        response: { status: 422, data: {} },
      }),
    ).toContain("too long or invalid");
    expect(
      getChatbotErrorMessage({
        isAxiosError: true,
        response: { status: 429, data: {} },
      }),
    ).toContain("request limit");
    expect(
      getChatbotErrorMessage({
        isAxiosError: true,
        response: {
          status: 503,
          data: { detail: "Venue search is temporarily unavailable" },
        },
      }),
    ).toContain("Venue search");
    expect(
      getChatbotErrorMessage({ isAxiosError: true, request: {} }),
    ).toContain("network");
  });
});

describe("ChatBot conversation state", () => {
  beforeEach(() => {
    getChatbotReply.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("sends returned context on the next turn and renders venue links", async () => {
    const searchContext: ChatbotConversationContext = {
      active_search_parameters: { location: "Times Square", radius_km: 3 },
      last_recommended_venue_ids: ["venue-101"],
      clarification_asked: false,
      last_intent: "new_search",
    };
    getChatbotReply
      .mockResolvedValueOnce({
        response: "Here is a match.",
        model: "test",
        venues: [venue],
        conversation_context: searchContext,
      })
      .mockResolvedValueOnce({
        response: "It is the least busy.",
        model: "test",
        venues: [venue],
        conversation_context: {
          ...searchContext,
          last_intent: "compare_previous",
        },
      });

    render(
      <MemoryRouter>
        <ChatBot />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText("Open workspace assistant"));
    fireEvent.change(screen.getByLabelText("Workspace request"), {
      target: { value: "Find near Times Square" },
    });
    fireEvent.click(screen.getByLabelText("Send workspace request"));

    expect(await screen.findByRole("link", { name: /Example Workspace/ })).toHaveAttribute(
      "href",
      "/venue/venue-101",
    );

    fireEvent.change(screen.getByLabelText("Workspace request"), {
      target: { value: "Which one is least busy?" },
    });
    fireEvent.click(screen.getByLabelText("Send workspace request"));

    await waitFor(() => expect(getChatbotReply).toHaveBeenCalledTimes(2));
    expect(getChatbotReply.mock.calls[1][2]).toEqual(searchContext);
    expect(getChatbotReply.mock.calls[1][1]).toHaveLength(2);
  });

  it("reset clears messages and structured context", async () => {
    getChatbotReply.mockResolvedValue({
      response: "A result.",
      model: "test",
      venues: [],
      conversation_context: emptyContext,
    });

    render(
      <MemoryRouter>
        <ChatBot />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText("Open workspace assistant"));
    fireEvent.change(screen.getByLabelText("Workspace request"), {
      target: { value: "Find a cafe" },
    });
    fireEvent.click(screen.getByLabelText("Send workspace request"));
    expect(await screen.findByText("A result.")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Reset conversation"));
    expect(screen.queryByText("A result.")).not.toBeInTheDocument();
    expect(screen.queryByText("Find a cafe")).not.toBeInTheDocument();
  });
});
