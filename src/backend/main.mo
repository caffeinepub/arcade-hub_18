import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";



actor {
  // --- Types ---
  type ScoreEntry = {
    player : Text;
    score : Nat;
  };

  module ScoreEntry {
    public func compareByScore(a : ScoreEntry, b : ScoreEntry) : Order.Order {
      Nat.compare(b.score, a.score); // Descending order
    };
  };

  type ChatMessage = {
    id : Nat;
    sender : Text;
    text : Text;
    timestamp : Int;
  };

  let highScores = Map.empty<Text, Map.Map<Text, ScoreEntry>>();

  var nextMessageId = 1;

  let chatRoomMessages = Map.empty<Text, [ChatMessage]>();
  var globalMessages : [ChatMessage] = [];
  let maxMessages = 200;

  // --- Scoreboard Functions ---
  public shared ({ caller }) func submitScore(gameId : Text, player : Text, score : Nat) : async () {
    if (player.size() == 0) {
      Runtime.trap("Player name cannot be empty");
    };

    let gameScores = switch (highScores.get(gameId)) {
      case (null) { Map.empty<Text, ScoreEntry>() };
      case (?scores) { scores };
    };

    let currentScore = switch (gameScores.get(player)) {
      case (null) { 0 };
      case (?entry) { entry.score };
    };

    if (score > currentScore) {
      let entry : ScoreEntry = {
        player;
        score;
      };
      gameScores.add(player, entry);
      highScores.add(gameId, gameScores);
    };
  };

  public query ({ caller }) func getLeaderboard(gameId : Text) : async [ScoreEntry] {
    switch (highScores.get(gameId)) {
      case (null) { [] };
      case (?scores) {
        let entries = scores.values().toArray().sort(ScoreEntry.compareByScore);
        entries.sliceToArray(0, if (entries.size() < 10) { entries.size() } else { 10 });
      };
    };
  };

  public query ({ caller }) func getPersonalBest(gameId : Text, player : Text) : async ?Nat {
    switch (highScores.get(gameId)) {
      case (null) { null };
      case (?scores) {
        switch (scores.get(player)) {
          case (null) { null };
          case (?entry) { ?entry.score };
        };
      };
    };
  };

  // --- Chat Functions ---
  public shared ({ caller }) func sendMessage(sender : Text, text : Text) : async Nat {
    addMessage("global", sender, text);
  };

  public query ({ caller }) func getMessages() : async [ChatMessage] {
    globalMessages;
  };

  public shared ({ caller }) func sendRoomMessage(code : Text, sender : Text, text : Text) : async Nat {
    addMessage(code, sender, text);
  };

  public query ({ caller }) func getRoomMessages(code : Text) : async [ChatMessage] {
    switch (chatRoomMessages.get(code)) {
      case (null) { [] };
      case (?messages) { messages };
    };
  };

  func addMessage(room : Text, sender : Text, text : Text) : Nat {
    if (sender.size() == 0 or text.size() == 0) {
      Runtime.trap("Sender and message cannot be empty");
    };

    let newMessage : ChatMessage = {
      id = nextMessageId;
      sender;
      text;
      timestamp = Time.now();
    };

    if (room == "global") {
      let tempMessages = [newMessage].concat(globalMessages);
      globalMessages := if (tempMessages.size() > maxMessages) {
        tempMessages.sliceToArray(0, maxMessages);
      } else {
        tempMessages;
      };
    } else {
      let roomMessages = switch (chatRoomMessages.get(room)) {
        case (null) { [newMessage] };
        case (?msgs) {
          let tempMessages = [newMessage].concat(msgs);
          if (tempMessages.size() > maxMessages) {
            tempMessages.sliceToArray(0, maxMessages);
          } else {
            tempMessages;
          };
        };
      };
      chatRoomMessages.add(room, roomMessages);
    };

    nextMessageId += 1;
    newMessage.id;
  };
};
