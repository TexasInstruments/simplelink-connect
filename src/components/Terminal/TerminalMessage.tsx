import { useTerminalConfigContext } from '../../context/TerminalOptionsContext';
import { Text, View } from '../Themed';
import { AnsiComponent } from 'react-native-ansi-view';
interface RenderItemProps {
  message: string;
  date: string;
  received: boolean;
  length: number;
}

const TerminalRenderItem: React.FC<RenderItemProps> = ({ message, date, received, length }) => {
  let { terminalConfig: config, } = useTerminalConfigContext();

  while (message.includes('\u0000')) {
    message = message.replace('\u0000', '');
  }

  const getMessage = () => {
    if (received) {
      return <AnsiComponent textStyle={{ color: '#03DAC5', flexWrap: 'wrap', flex: 1 }} ansi={message} />
    }
    else {
      return <AnsiComponent textStyle={{ color: 'white', flexWrap: 'wrap', flex: 1 }} ansi={message} />
    }
  }

  if (config.disabledLocalEcho && !received) {
    return <></>
  }

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: 'black',
        flex: 1
      }}
    >
      {config.timestamp && date && <Text style={{ color: received ? '#03DAC5' : 'white', paddingRight: 5, flexWrap: 'wrap' }}>{date}</Text>}
      {config.messageLength && length && <Text style={{ color: received ? '#03DAC5' : 'white', paddingRight: 5, flexWrap: 'wrap' }}>[{length}]</Text>}
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        {getMessage()}
      </View>
    </View>
  );
};
export default TerminalRenderItem;
