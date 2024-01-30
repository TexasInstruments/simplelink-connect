import { createIconSetFromFontello } from 'react-native-vector-icons';
import fontelloConfig from '../../assets/fonts/brands_font_config.json';
import { BrandIconName } from '../../../types';

const Icon = createIconSetFromFontello(fontelloConfig);

interface Props {
  name: BrandIconName;
  size?: number;
}

const BrandIcon: React.FC<Props> = ({ name, size }) => {
  return <Icon name={name} size={size ? size : 16} />;
};

export default BrandIcon;
