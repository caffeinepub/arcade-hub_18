import Text "mo:core/Text";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";

actor {
  type ScoreEntry = {
    player : Text;
    score : Nat;
  };

  module ScoreEntry {
    public func compareByScore(a : ScoreEntry, b : ScoreEntry) : Order.Order {
      Nat.compare(b.score, a.score); // Descending order
    };
  };

  let highScores = Map.empty<Text, Map.Map<Text, ScoreEntry>>();

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
};
