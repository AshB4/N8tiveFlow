// UXUI/Components/CalendarPage/QueuePanel.jsx
const QueuePanel = ({ schedule }) => {
  return (
    
    <div className="bg-black text-teal-300 font-mono p-4 border-2 border-pink-600 shadow-lg w-64">
      <h2 className="text-pink-500 text-xl mb-4">QUEUE</h2>
      {Object.entries(schedule).map(([day, post]) => (
        <div key={day} className="mb-3">
          <div className="uppercase">{day}</div>
          <div className="pl-2 text-pink-300">“{post.title}”</div>
          <div className="pl-2 text-sm text-teal-400">={post.platform}</div>
        </div>
      ))}
    </div>
  );
};

export default QueuePanel;
