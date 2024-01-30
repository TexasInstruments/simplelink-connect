import { Text, View } from '../Themed';

interface RenderItemProps {
  message: string;
  date: string;
}

const TerminalRenderItem: React.FC<RenderItemProps> = ({ message, date }) => {
  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: 'black',
      }}
    >
      {date && <Text style={{ color: 'white', paddingRight: 5 }}>{date}</Text>}
      <Text style={{ color: 'white', flexWrap: 'wrap', flex: 1 }}>{message}</Text>
    </View>
  );
};
export default TerminalRenderItem;
