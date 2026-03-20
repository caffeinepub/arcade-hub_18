import Map "mo:core/Map";
import Text "mo:core/Text";

module {
  type ScoreEntry = {
    player : Text;
    score : Nat;
  };

  type ChatMessage = {
    id : Nat;
    sender : Text;
    text : Text;
    timestamp : Int;
  };

  type OldActor = {
    highScores : Map.Map<Text, Map.Map<Text, ScoreEntry>>;
    chatMessages : [ChatMessage];
    nextMessageId : Nat;
  };

  type NewActor = {
    highScores : Map.Map<Text, Map.Map<Text, ScoreEntry>>;
    chatRoomMessages : Map.Map<Text, [ChatMessage]>;
    globalMessages : [ChatMessage];
    nextMessageId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      globalMessages = old.chatMessages;
      chatRoomMessages = Map.empty<Text, [ChatMessage]>();
    };
  };
};
