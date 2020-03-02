import React, {Component} from 'react';
import TRAIN_LABELS from '../train-labels';
import { Select } from "baseui/select";
import {styled} from 'baseui';

/*
  Calculate maps of training label data for faster rendering
  since we're using a static list of labels, this can be done with singletons.
  If moved to API-provided labels, would have to do this at response time
*/
const IMAGES_BY_LABEL = TRAIN_LABELS.reduce((acc, label) => {
  if (!acc[label.Label]) {
    acc[label.Label] = []
  }
  acc[label.Label].push(label)
  return acc;
}, {});
const IMAGES_BY_NAME = TRAIN_LABELS.reduce((acc, label) => {
  acc[label.Img_Name] = label
  return acc;
}, {});

const UNIQUE_LABELS_FREQ_TABLE = TRAIN_LABELS.reduce((acc, label) => {
  if (!acc[label.Label]) {
    acc[label.Label] = 0
  }
  acc[label.Label] += 1;
  return acc;
}, {});
const UNIQUE_LABELS = Object.keys(UNIQUE_LABELS_FREQ_TABLE);
const IMAGE_SIZES = {};

const IMAGE_WIDTH = 400;

// allow alternate image sources
const getImageUriFromNameAndType = (name, dataType='train_images') => `./static/${dataType}/${name}`;

const StyledBody = styled('div', {
  display: 'table',
  margin: '24px auto 0 auto'
});

const StyledCard = styled('div', {
  maxWidth: `${IMAGE_WIDTH}px`,
  padding: '16px',
  boxShadow: '0 0 5px 5px rgba(0, 0, 0, .03)',
  borderRadius: '16px',
  display: 'inline-block',
  marginRight: '8px',
  marginTop: '8px'
});

const StyledImage = styled('img', {
  maxWidth: `${IMAGE_WIDTH}px`
})

const StyledImageContainer = styled('div', {
  maxWidth: `${IMAGE_WIDTH}px`,
  boxShadow: '0 0 5px 5px rgba(0, 0, 0, .03)',
  borderRadius: '16px',
  display: 'inline-block',
  marginRight: '8px',
  marginTop: '8px',
  position: 'relative',
  cursor: 'pointer'
});

class ImageFinder extends Component {
  constructor() {
    super();
    this.loaders = [];
    this.state = {
      loadedImages: [],
      dataType: 'train_images'
    };
  }
  /*
    loads images in order for poor network conditions
    also necessary for measuring image natural width for box label math
    stores in progress images under this.loaders
    reset all loaders whenever called to prevent background blockers
  */
  loadImages(label) {
    this.loaders.map(l => {
      l.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAI=;'
    });
    this.loaders = [];
    const toLoad = label !== 'all' ? IMAGES_BY_LABEL[label] : TRAIN_LABELS;
    return Promise.all(toLoad.map(image => {
      return new Promise((resolve, reject) => {
        const myImage = new Image();
        this.loaders.push(myImage)
        myImage.onload = () => {
          if (this.state.value && this.state.value[0] &&
            this.state.value[0].id && this.state.value[0].id !== label) {
            reject();
            return null;
          }
          IMAGE_SIZES[image.Img_Name] = [myImage.width, myImage.height];
          this.setState({
            loadedImages: this.state.loadedImages.concat(image.Img_Name)
          });
          resolve();
        }
        myImage.onerror = () => {
          resolve();
        }
        myImage.src = getImageUriFromNameAndType(image.Img_Name, this.state.dataType);
      });
    }))
  }
  /*
    render single fullscreen image for better UX
  */
  renderFullScreen() {
    const sizeFactor = IMAGE_WIDTH / IMAGE_SIZES[this.state.fullScreen.Img_Name][0]
    return (
      <div style={{textAlign: 'left'}}>
        <div style={{margin: '4px 16px'}}>
          <div>
            <a href="blank" onClick={e => {
              e.preventDefault();
              this.setState({fullScreen: null});
            }}>
              {'Back'}
            </a>
          </div>
          <div>
            <label>{'filename: '}</label>
            <strong>{this.state.fullScreen.Img_Name}</strong>
          </div>
          <div>
            <label>{'label: '}</label>
            <strong>{this.state.fullScreen.Label}</strong>
          </div>
        </div>
        <div style={{position: 'relative'}}>
          <img src={getImageUriFromNameAndType(this.state.fullScreen.Img_Name)} />
          <div style={{
            position: 'absolute',
            border: '1px solid red',
            left: this.state.fullScreen.Left,
            top: this.state.fullScreen.Top,
            width: this.state.fullScreen.Width,
            height: this.state.fullScreen.Height,
          }} />
        </div>
      </div>
    )
  }
  /*
    renders list of images loaded from this.loadImages
  */
  renderAllImages() {
    if (! this.state.loadedImages.length) {
      return null;
    }
    return this.state.loadedImages.map(imageName => {
      const image = IMAGES_BY_NAME[imageName]
      const sizeFactor = IMAGE_WIDTH / IMAGE_SIZES[image.Img_Name][0]
      return (
        <StyledImageContainer
          onClick={() => {
            this.setState({
              fullScreen: image
            });
          }}>
          <StyledImage src={getImageUriFromNameAndType(image.Img_Name)} />
          <div style={{
            position: 'absolute',
            border: '1px solid red',
            left: image.Left * sizeFactor,
            top: image.Top * sizeFactor,
            width: image.Width * sizeFactor,
            height: image.Height * sizeFactor,
          }} />
        </StyledImageContainer>
      )
    });
  }
  render() {
    if (this.state.fullScreen) {
      return this.renderFullScreen();
    }
    return (
      <div>
        <a href="./static/source.js">View image-finder.js Source</a>
        <StyledBody>
          <StyledCard>
            <h1>{'Search for labels'}</h1>
            <Select
              options={[{
                label: `All (${TRAIN_LABELS.length} matches)`,
                id: 'all'
              }].concat(UNIQUE_LABELS.map(label => {
                return {
                  label: `${label} (${UNIQUE_LABELS_FREQ_TABLE[label]} matches)`,
                  id: label
                }
              }))}
              value={this.state.value}
              onChange={params => {
                this.setState({
                  value: params.value,
                  imagesLoading: true,
                  loadedImages: []
                });
                this.loadImages(params.value[0] && params.value[0].id)
              }}/>
          </StyledCard>
        </StyledBody>
        {this.renderAllImages()}
      </div>
    );
  }
}

export default ImageFinder;
